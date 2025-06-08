---
title: Building a Homelab - Part 2 - Foundation Architecture
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


# Building a Decade of Homelab Infrastructure: Part 2 - Foundation Architecture

In Part 1, we explored the diverse ecosystem of services running in my homelab. But here's the thing - having 30+ services is meaningless if users have to remember URLs like `http://192.168.1.10:8989` for Sonarr and `https://192.168.1.10:9443` for Portainer. Even worse, imagine managing separate user accounts for each service, dealing with certificate warnings, and troubleshooting port conflicts every time you add something new.

This is where proper infrastructure architecture becomes crucial. Over the past decade, I've learned that the difference between a hobbyist setup and something that actually works long-term comes down to three foundational pillars: **intelligent networking**, **centralized authentication**, and **automated certificate management**.

Today, we'll dive deep into how these systems work together to create a seamless, secure, and maintainable homelab infrastructure.

## Prerequisites: The DNS Foundation

Before we dive into the technical setup, there's one critical requirement: you need a **static public IP address and a domain name**. This entire architecture depends on external DNS resolution working properly.

### Here's what you need to configure with your DNS provider:

```
lab.example.com         A    YOUR_PUBLIC_IP
*.lab.example.com       A    YOUR_PUBLIC_IP
```

The wildcard record (`*.lab.example.com`) is crucial—it means that any subdomain like `sonarr.lab.example.com` or `jellyfin.lab.example.com` will automatically resolve to your server.

If you don't have a static IP, many ISPs offer them for a small monthly fee, or you can use dynamic DNS services, though that adds complexity we won't cover here.

## The Networking Challenge

When I started in 2015, my approach was... let's call it "primitive." Each service ran on its own port, and I'd bookmark URLs like `http://serverIP:32400` for Plex and `http://serverIP:8080` for whatever else I was running that week. This quickly became unsustainable.

### The modern approach uses a reverse proxy

Think of it as a smart receptionist who knows exactly which internal department to route each visitor to, based on nothing more than the name they ask for.

### Dynamic Service Routing (Nginx Example)

```nginx
server {
    server_name ~^(?<project_name>\w+)\.lab\.example\.com$;
    server_tokens off;
    listen 443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/lab.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    include inc/authelia.conf;
    client_max_body_size 1024M;

    location / {
        set $project_port "00";
        
        if ( $project_name = "sonarr" ) {
            set $project_port "8989";
        }
        if ( $project_name = "jellyfin" ) {
            set $project_port "8096";
        }
        if ( $project_name = "photos" ) {
            set $project_name "192.168.30.20";
            set $project_port "2283";
        }
        # ... more service mappings
        
        if ( $project_port = "00" ) {
            return 404;
        }
        
        proxy_pass http://$project_name:$project_port;
        include inc/auth.conf;
        include inc/proxy.conf;
    }
}
```

This configuration handles routing for dozens of services by subdomain.

## The Docker Networking Foundation

```yaml
networks:
  infra_homelab:
    external: true

services:
  sonarr:
    image: lscr.io/linuxserver/sonarr
    container_name: sonarr
    networks:
      - infra_homelab
    # ... other config
```

## SSL Automation: Never Think About Certificates Again

### Cloudflare DNS Integration

```yaml
certbot:
  container_name: certbot
  image: certbot/dns-cloudflare
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
    - ./certbot/cloudflare.ini:/root/cloudflare.ini
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
  restart: unless-stopped
```

### Cloudflare Credentials

```ini
# cloudflare.ini
dns_cloudflare_api_token = your_cloudflare_api_token_here
```

### Initial Certificate Generation

```bash
#!/bin/bash
domains=(lab.example.com *.lab.example.com)
rsa_key_size=4096
email="your-email@example.com"

docker-compose run --rm --entrypoint "\
  certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials /root/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 15\
    --email $email \
    -d lab.example.com \
    -d *.lab.example.com \
    --rsa-key-size $rsa_key_size \
    --agree-tos --no-eff-email \
    --force-renewal" certbot
```

## Authentication: Single Sign-On for Everything

### LLDAP Configuration

```yaml
lldap:
  image: nitnelave/lldap:stable
  networks:
    - infra_homelab
  ports:
    - "3890:3890"
    - "17170:17170"
  volumes:
    - "./lldap:/data"
  environment:
    - UID=1000
    - GID=1000
    - LLDAP_JWT_SECRET=your_jwt_secret_here
    - LLDAP_LDAP_USER_PASS=your_admin_password
    - LLDAP_LDAP_BASE_DN=dc=example,dc=com
```

### Authelia Configuration

```yaml
authentication_backend:
  ldap:
    implementation: custom
    address: ldap://lldap:3890
    timeout: 5s
    start_tls: false
    base_dn: dc=example,dc=com
    additional_users_dn: ou=people
    users_filter: (&({username_attribute}={input})(objectClass=person))
    additional_groups_dn: ou=groups
    groups_filter: (member={dn})
    attributes:
      username: uid
      group_name: cn
      mail: mail
      display_name: displayName
    user: uid=admin,ou=people,dc=example,dc=com
    password: 'your_ldap_admin_password'

access_control:
  default_policy: deny
  rules:
    - domain: lab.example.com
      policy: one_factor
    - domain: jellyfin.lab.example.com
      policy: bypass
    - domain: overseerr.lab.example.com
      policy: bypass
    - domain_regex:
        - '^(.+)\.lab\.example\.com$'
      policy: one_factor

session:
  secret: your_session_secret_here
  redis:
    host: authelia_redis
    port: 6379
```

### Nginx Integration

```nginx
# inc/authelia.conf
location /authelia {
    internal;
    set $upstream_authelia http://authelia:9091/api/verify;
    proxy_pass_request_body off;
    proxy_pass $upstream_authelia;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Uri $request_uri;
}
```

```nginx
# inc/auth.conf
auth_request /authelia;
auth_request_set $target_url $scheme://$http_host$request_uri;
auth_request_set $user $upstream_http_remote_user;
auth_request_set $groups $upstream_http_remote_groups;
auth_request_set $name $upstream_http_remote_name;
auth_request_set $email $upstream_http_remote_email;

error_page 401 =302 https://auth.lab.example.com/?rd=$target_url;

proxy_set_header X-Forwarded-User $user;
proxy_set_header X-Forwarded-Groups $groups;
proxy_set_header X-Forwarded-Name $name;
proxy_set_header X-Forwarded-Email $email;
```

## How It All Works Together

When a user visits any service:

1. **DNS Resolution:** `sonarr.lab.example.com` resolves to your public IP.
2. **Nginx Routing:** Extracts `sonarr` from subdomain, proxies to container.
3. **Authentication Check:** Authelia verifies access rights.
4. **Service Proxy:** If authenticated, Nginx routes to `http://sonarr:8989`.
5. **Response:** The user sees the UI with a clean, secured URL.

## The Development Workflow

1. Add the service to a `docker-compose` file with the `infra_homelab` network.
2. Add the subdomain mapping to Nginx configuration.
3. Deploy and test.

No certificate generation, no user account creation, no port management—the infrastructure handles all of that automatically.

## What's Coming Next

This series will unfold across three detailed posts:

1. **Part 1: The Service Ecosystem**  - Understanding what runs and why
2. **Part 2: Foundation Architecture** (This post) - Networking, security, and service discovery 
3. **Part 3: Advanced Operations** - Scaling, monitoring, and maintenance
