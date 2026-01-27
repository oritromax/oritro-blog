---
title: Grafana Alloy setup in Podman
date: 2026-01-27 12:51:19
tags:
    - grafana
    - alloy
    - logs
    - podman
    - homelab
categories:
    - homelab

---

Setting up Grafana Alloy to collect container logs from a rootless Podman setup turned out to be surprisingly tricky. If you're running Alloy on Docker, the standard configurations work fine. But with rootless Podman, there are several gotchas that can leave you scratching your head for hours. Here's everything I learned getting it working.

## The Problem

I have Grafana and Loki running on one machine, and multiple other machines running containers with Alloy collecting logs. Everything worked fine on my Docker-based machines, but my NAS running rootless Podman refused to send container logs to Loki. The Alloy container would start, but no container logs appeared in Grafana.

## Why Rootless Podman is Different

With Docker, container logs typically go to `/var/lib/docker/containers/` as JSON files, or you can use `loki.source.docker` to read them directly via the Docker socket.

Rootless Podman is different:
- It uses **journald** for logging by default
- Container logs go to the **user journal**, not the system journal
- The user journal is stored alongside system journals in `/var/log/journal/<machine-id>/` but as `user-<uid>.journal` files
- Access requires proper permissions or group membership

## The Working Configuration

After much debugging, here's the configuration that works:

### docker-compose.yaml

```yaml
alloy:
  image: grafana/alloy:latest
  group_add:
    - "101"  # systemd-journal group - check yours with: grep systemd-journal /etc/group
  volumes:
    - ./alloy/config.alloy:/etc/alloy/config.alloy
    - /run/log/journal:/run/log/journal:ro
    - /var/log/journal:/var/log/journal:ro
    - /etc/machine-id:/etc/machine-id:ro
  command: run --server.http.listen-addr=0.0.0.0:12345 /etc/alloy/config.alloy
  ports:
    - "12345:12345"
  restart: unless-stopped
```

The key addition is `group_add: ["101"]` which adds the `systemd-journal` group to the container. Without this, Alloy can read system journal entries but not user journal entries where Podman container logs live.

### config.alloy

```alloy
// Relabel rules to extract container labels from journal
loki.relabel "journal" {
  forward_to = []

  // Use SYSLOG_IDENTIFIER as container name
  rule {
    source_labels = ["__journal_syslog_identifier"]
    target_label  = "container_name"
    replacement   = "NAS-$1"  // Prefix with hostname
    regex         = "(.+)"
  }

  // Set host label
  rule {
    replacement  = "NAS"
    target_label = "host"
  }
}

// Collect Podman container logs from journald
loki.source.journal "podman" {
  forward_to    = [loki.relabel.cleanup.receiver]
  path          = "/var/log/journal"
  relabel_rules = loki.relabel.journal.rules
  labels        = { job = "podman" }
}

// Final cleanup - drop internal labels
loki.relabel "cleanup" {
  forward_to = [loki.write.default.receiver]

  // Exclude system services
  rule {
    source_labels = ["container_name"]
    regex         = "NAS-(podman|systemd)"
    action        = "drop"
  }

  // Drop all journal internal labels
  rule {
    action = "labeldrop"
    regex  = "__.*"
  }
  rule {
    action = "labeldrop"
    regex  = "_.*"
  }
}

// Send logs to Loki
loki.write "default" {
  endpoint {
    url = "http://your-loki-server:3100/loki/api/v1/push"
  }
}
```

## The Gotchas Explained

### 1. User Journal Access

The biggest issue was that Alloy could read the journal files but wasn't seeing entries from the user journal. Even though the files are in the same directory, the journal library needs proper group membership to access user journal entries.

**Solution:** Add the `systemd-journal` group (usually GID 101, check with `grep systemd-journal /etc/group`).

### 2. Too Many Labels (HTTP 400 from Loki)

Initially, Alloy was sending all journald fields as labels. Journal entries have many fields like `_CMDLINE`, `_SYSTEMD_CGROUP`, `_AUDIT_SESSION`, etc. This caused Loki to reject entries with HTTP 400 errors:

```
entry for stream '{_cmdline="/usr/bin/conmon --api-version 1 -c ..."}'
```

**Solution:** Use `labeldrop` rules to remove `__journal_*` and `_*` prefixed labels.

### 3. Wrong Field Name for Container Name

I initially tried `__journal_container_name` and `__journal_CONTAINER_NAME` expecting them to contain the container name. Neither worked.

Looking at journal entries with `journalctl --user -o verbose`, I could see `CONTAINER_NAME=nginx` in the output. But Alloy's journal source doesn't expose this field. Instead, `SYSLOG_IDENTIFIER` contains the container name for Podman logs.

**Solution:** Use `__journal_syslog_identifier` as the source for container names.

### 4. System vs Container Logs

Without filtering, you'll also get logs from `podman` (the API server) and `systemd` services. These aren't container application logs.

**Solution:** Add a `drop` rule for known system service identifiers.

## Verifying It Works

After applying the configuration:

```bash
# Check Alloy metrics
curl -s http://localhost:12345/metrics | grep loki_write_sent_entries

# Query Loki for your container logs
curl -s "http://your-loki:3100/loki/api/v1/label/container_name/values"
```

You should see your container names with the prefix you configured (e.g., `NAS-nginx`, `NAS-authelia`).

## Debugging Tips

If logs aren't appearing:

1. **Check Alloy logs:** `podman logs your-alloy-container` - look for HTTP 400 errors
2. **Verify journal access:** The container should be able to read user journal files
3. **Check metrics:** `curl localhost:12345/metrics | grep loki` - look at entries processed vs written
4. **Verify Loki is receiving:** Query Loki labels endpoint to see what's arriving

## Note: This Only Collects Container Logs

The configuration above is specifically designed to collect **only container application logs**. It filters out system services like `podman` and `systemd`.

If you want to collect additional logs (SSH, nginx on host, systemd services, etc.), you'll need to modify the Alloy rules. Here are some examples:

### Include Specific System Services

Remove or modify the drop rule to allow certain services:

```alloy
// Drop only podman API logs, keep everything else
rule {
  source_labels = ["container_name"]
  regex         = "NAS-podman"
  action        = "drop"
}
```

### Collect All Journal Logs

Remove the drop rule entirely to collect everything from the journal:

```alloy
loki.relabel "cleanup" {
  forward_to = [loki.write.default.receiver]

  // No drop rule - collect everything

  rule {
    action = "labeldrop"
    regex  = "__.*"
  }
  rule {
    action = "labeldrop"
    regex  = "_.*"
  }
}
```

### Add a Separate Source for System Logs

You can also create multiple journal sources with different filters:

```alloy
// Container logs
loki.source.journal "containers" {
  forward_to    = [loki.relabel.containers.receiver]
  path          = "/var/log/journal"
  matches       = "CONTAINER_NAME=.+"
  labels        = { job = "containers" }
}

// System logs
loki.source.journal "system" {
  forward_to    = [loki.relabel.system.receiver]
  path          = "/var/log/journal"
  matches       = "_SYSTEMD_UNIT=sshd.service"
  labels        = { job = "system" }
}
```

Adjust the `matches` parameter to filter for the specific journal fields you need.

## Conclusion

Getting Grafana Alloy to work with rootless Podman requires understanding how Podman's journald logging differs from Docker. The key points are:

1. Add the `systemd-journal` group to access user journals
2. Use `__journal_syslog_identifier` for container names (not `container_name`)
3. Drop the excessive journal labels that Loki will reject
4. Filter out system service logs if you only want container logs

Once configured correctly, you get all your container logs flowing to Grafana with proper labels for filtering and querying.

