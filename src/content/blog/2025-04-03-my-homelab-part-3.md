---
title: Building a Homelab - Part 3 - Advanced Operations
date: 2025-04-02 14:43:11
tags:
    - homelab
    - docker
    - server
    - self-hosted
    - nas
categories: 
    - homelab 
description: This post is a part of 3 posts sharing my experience in building my own homelab ecosystem. 

---


# Homelab Operational Excellence: Keeping Your Infrastructure Running Smoothly

In Parts 1 and 2, we explored the services ecosystem and the foundational architecture that makes everything work seamlessly. But here's what nobody tells you when you're getting started with homelab infrastructure: the real challenge isn't getting services running—it's keeping them running reliably over months and years.

After a decade of running increasingly complex setups, I've learned that operational excellence is what separates a hobby project from something your family depends on daily. There's nothing quite like your spouse asking why the photos aren't loading or why the smart home automations stopped working to teach you about the importance of monitoring, backups, and systematic maintenance.

This guide dives into the operational strategies, monitoring approaches, and maintenance workflows that keep this infrastructure running smoothly through hardware failures, software updates, and the inevitable 2 AM "why is everything broken" moments.

## The Reality of Long-Term Operations

Running a homelab at this scale means you're essentially becoming a systems administrator for your household. Services will break, hardware will fail, and updates will occasionally go sideways. The goal isn't to prevent all problems—it's to detect them quickly, understand their impact, and resolve them efficiently.

The operational philosophy centers around three core principles:

- **Observability First**: You can't fix what you can't see.
- **Automation Over Documentation**: Scripts don't forget steps.
- **Graceful Degradation**: Critical services should survive dependency failures.

## Monitoring and Observability

The monitoring stack has evolved significantly from hoping nothing breaks. Today's approach provides multiple layers of visibility into system health, performance, and capacity.

### System-Level Monitoring with Homepage

Homepage serves as more than just a pretty dashboard—it's the operational control center that gives immediate visibility into service health:

```yaml
# homepage/widgets.yaml
- resources:
    label: CPU
    cpu: true

- resources:
    label: RAM    
    memory: true

- resources:
    label: System
    disk: /

- resources:
    label: Work
    disk: /storage4

- resources:
    label: Movies
    disk: /storage8_1

- resources:
    label: TV Shows
    disk: /storage8_2
```

The resource widgets immediately show if I'm running into capacity constraints. Each service widget connects directly to the application's API to show real-time status:

```yaml
# Service-specific monitoring
- Sonarr:
    widget:
        type: sonarr
        url: http://sonarr:8989
        key: your_api_key_here
        enableQueue: true

- Immich:
    widget: 
        type: immich
        url: https://photos.lab.example.com
        key: your_api_key_here
        version: 2
        fields: ["photos", "videos"]
```

This approach ensures the dashboard shows meaningful operational data like queue depths, processing status, and capacity utilization.

### Log Aggregation with Dozzle

Centralized logging is crucial when managing dozens of containers. Dozzle provides real-time log viewing across all containers:

```yaml
dozzle:
  container_name: dozzle
  image: amir20/dozzle:latest
  networks:
    - infra_homelab
  volumes:
    - /run/user/1000/podman/podman.sock:/var/run/docker.sock
  ports:
    - 8080:8080
```

The real power comes from correlating logs across services. When Sonarr fails to download something, I can quickly check qBittorrent logs, Jackett logs, and network connectivity all from one interface.

### Proactive Notifications with NTFY

The notification system evolved from reactive alerting to proactive status updates. NTFY handles everything from service health alerts to deployment notifications:

```yaml
ntfy:
  image: binwiederhier/ntfy
  container_name: ntfy
  command:
    - serve
  environment:
    - NTFY_AUTH_FILE=/conf/user.db
    - NTFY_AUTH_DEFAULT_ACCESS=deny-all
    - NTFY_BASE_URL=https://ntfy.lab.example.com
    - NTFY_UPSTREAM_BASE_URL=https://ntfy.sh
  volumes:
    - ./ntfy/cache:/var/cache/ntfy
    - ./ntfy/ntfy:/etc/ntfy
    - ./ntfy/conf:/conf
```

The notification strategy focuses on actionable alerts for:

- Service health check failures
- Disk usage exceeding thresholds
- Backup operation completion or failure
- Security events (failed authentication attempts)
- Available system updates

## Backup and Disaster Recovery

The backup strategy has evolved through painful learning experiences, focusing on data classification and recovery time objectives.

### Data Classification Strategy

Not all data requires the same backup strategy. Data is classified into three tiers:

- **Tier 1 - Irreplaceable Data**: Family photos, documents, personal files
  - Backed up to multiple locations including cloud storage
  - Daily automated backups with verification
  - Immich handles photo backup with automatic smartphone sync
- **Tier 2 - Configuration Data**: Container configurations, database contents, settings
  - Version controlled where possible
  - Regular automated backups to NAS storage
  - Quick recovery procedures documented
- **Tier 3 - Replaceable Data**: Media files, cached content, temporary files
  - No backup required—can be re-downloaded or regenerated
  - Stored on redundant storage with RAID protection

### Automated Backup Workflows

The backup system uses volume mapping and automated scripts. Critical data is mapped to persistent storage outside containers:

```yaml
# Example: Paperless configuration
paperless-webserver:
  volumes:
    - ./paperless/data:/usr/src/paperless/data
    - /media/NAS/storage4/paperless/media:/usr/src/paperless/media
    - /media/NAS/storage4/paperless/export:/usr/src/paperless/export
```

Database backups are automated through scheduled tasks that create consistent snapshots:

```bash
#!/bin/bash
# Database backup script
BACKUP_DIR="/storage4/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL databases
docker exec immich_postgres pg_dump -U postgres immich > "$BACKUP_DIR/immich.sql"
docker exec paperless-db mysqldump -u paperless -p paperless > "$BACKUP_DIR/paperless.sql"

# Backup configuration files
tar -czf "$BACKUP_DIR/configs.tar.gz" ./core ./media ./documents

# Send notification
curl -X POST https://ntfy.lab.example.com/system \
  -d "Backup completed: $BACKUP_DIR"
```

## Update Management and Change Control

Software updates require balancing security, stability, and new features. The update strategy varies by service criticality and complexity.

### Staged Update Process

Updates follow a staged approach:

- **Development Environment**: Test major updates in an isolated environment first
- **Non-Critical Services**: Update utilities and development tools first
- **Media Services**: Update during low-usage periods with rollback plan
- **Core Infrastructure**: Update during planned maintenance windows only

### Container Update Automation

Most services use specific version tags to prevent unexpected updates:

```yaml
services:
  sonarr:
    image: lscr.io/linuxserver/sonarr:4.0.0  # Specific version
    # image: lscr.io/linuxserver/sonarr:latest  # Avoided in production
```

Update scripts check for new versions and provide controlled update paths:

```bash
#!/bin/bash
# Update management script
SERVICE=$1
CURRENT_VERSION=$(docker inspect --format='{{.Config.Image}}' $SERVICE)

echo "Current version: $CURRENT_VERSION"
echo "Pulling latest version..."

# Pull new image
docker pull $CURRENT_VERSION

# Stop service
docker-compose stop $SERVICE

# Update with backup of old container
docker tag $CURRENT_VERSION ${CURRENT_VERSION}_backup
docker-compose up -d $SERVICE

# Verify health
sleep 30
if docker ps | grep -q $SERVICE; then
    echo "Update successful"
    # Clean up backup image after 24 hours
else
    echo "Update failed, rolling back"
    docker tag ${CURRENT_VERSION}_backup $CURRENT_VERSION
    docker-compose up -d $SERVICE
fi
```

## Performance Optimization and Scaling

As the service count grows, performance optimization becomes crucial, focusing on resource allocation, storage optimization, and intelligent scaling.

### Hardware Resource Management

GPU acceleration is configured across multiple services to maximize hardware utilization:

```yaml
# Immich with GPU acceleration
immich-server:
  extends:
     file: hwaccel.transcoding.yml
     service: nvenc
  devices:
    - /dev/dri/renderD128:/dev/dri/renderD128

# Frigate with GPU for AI processing
frigate:
  deploy: 
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  environment:
    DETECTORS: 'gpu'
```

### Storage Strategy and Optimization

Storage allocation follows a tiered approach based on performance requirements:

- **NVMe SSD**: OS, container images, databases, active transcoding
- **Traditional HDD**: Long-term media storage, backup storage
- **Network Storage**: Archive storage, redundant backups

The storage mapping strategy separates hot data from cold storage:

```yaml
# Hot data on fast storage
volumes:
  - ./jellyfin:/config  # Container config on SSD
  - /media/NAS/storage8_1/Movies:/media/NAS/Movies  # Media on HDD

# Database optimization
environment:
  - shared_buffers=512MB  # Tune PostgreSQL for available RAM
  - max_wal_size=2GB
  - wal_compression=on
```

## Security and Access Management

Security requires balancing convenience with protection, focusing on defense in depth while maintaining usability.

### Network Security

The network design creates security zones through Docker networks and firewall rules:

```yaml
# Isolated networks for different service types
networks:
  infra_homelab:
    external: true
  mosquitto:
    name: mosquitto
    driver: bridge  # Isolated MQTT network
```

Services needing external access are exposed through the reverse proxy only, with authentication handled centrally.

### Access Control and Audit

Authelia provides detailed access logging and flexible authorization rules:

```yaml
access_control:
  default_policy: deny
  rules:
    - domain: jellyfin.lab.example.com
      policy: bypass
      networks:
        - 192.168.30.0/24  # Only local network
    - domain: admin.lab.example.com
      policy: two_factor
      subject: "group:admins"
```

Failed authentication attempts trigger automatic notifications through NTFY, providing real-time security awareness.

## Operational Procedures and Documentation

Documentation is critical during emergency situations, though often neglected in homelab environments.

### Runbook Development

Key procedures are documented as executable scripts rather than written instructions:

```bash
#!/bin/bash
# Emergency service restart procedure
echo "Emergency restart initiated at $(date)"

# Stop services in dependency order
docker-compose -f media/players/docker-compose.yaml stop
docker-compose -f media/managers/docker-compose.yaml stop
docker-compose -f core/docker-compose.yaml stop

# Start core infrastructure first
docker-compose -f core/docker-compose.yaml up -d
sleep 60

# Start application services
docker-compose -f media/managers/docker-compose.yaml up -d
docker-compose -f media/players/docker-compose.yaml up -d

# Verify health
./scripts/health-check.sh
```

### Change Management

All infrastructure changes are tracked through Git, providing version control and rollback capabilities:

```bash
# Pre-change backup
git add -A
git commit -m "Pre-change backup: Adding new service"

# Make changes
# ...

# Post-change validation
./scripts/validate-deployment.sh

# Commit successful changes
git add -A
git commit -m "Added new monitoring service: Grafana"
```

## Lessons Learned and Best Practices

After a decade of operation, key lessons include:

- **Start Simple, Scale Gradually**: Every complex system started as a simple one that worked. Add complexity only when needed.
- **Automation Saves Sanity**: Manual processes will be forgotten during 2 AM emergencies. Automate everything you do more than twice.
- **Monitor Early, Monitor Often**: It's easier to add monitoring when deploying a service than retrofitting it later.
- **Plan for Failure**: Services will fail. Design systems that degrade gracefully and recover automatically.
- **Document Through Code**: Scripts and configuration files are better documentation than written procedures.

## Looking Forward

The homelab infrastructure has reached a mature state where operations are largely automated and predictable. Future evolution focuses on:

- Enhanced automation through AI-driven operations
- Improved disaster recovery with automated failover
- Better integration between home automation and infrastructure monitoring
- Migration toward infrastructure-as-code patterns for entire stack management

The journey from a single Plex server to this comprehensive infrastructure has been educational, frustrating, and ultimately rewarding. These operational practices mirror enterprise patterns, making this not just a homelab but a learning platform for modern infrastructure management.

Building reliable infrastructure takes time, patience, and willingness to learn from failures. But once you have systems that run themselves, automatically recover from common problems, and provide clear visibility into their health, you realize you've built something genuinely useful—a digital foundation that enhances daily life rather than creating constant maintenance overhead.

This series will unfold across three detailed posts:

1. [**Part 1: The Service Ecosystem**](https://ioritro.com/blog/2025-04-01-my-homelab-part-1/)  - Understanding what runs and why
2. [**Part 2: Foundation Architecture**](https://ioritro.com/blog/2025-04-02-my-homelab-part-2/)  - Networking, security, and service discovery 
3. **Part 3: Advanced Operations** (This post) - Scaling, monitoring, and maintenance

> Special Thanks to [ Sarim Khan ](https://github.com/sarim) for his uncounted number of helps during the development of my homelab. 
