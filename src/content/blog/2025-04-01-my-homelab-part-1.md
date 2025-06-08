---
title: Building a Decade of Homelab Infrastructure - Part 1
date: 2025-06-02 14:43:11
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

# Building a Decade of Homelab Infrastructure: Part 1 - The Service Ecosystem

Homelab has exploded in popularity since the pandemic hit, with people becoming increasingly interested in cutting the cord and keeping everything within their own network as much as possible. The current homelab ecosystem ranges from simply running a few basic services to almost industrial-looking setups, with everything imaginable in between.

I've been tinkering with homelab infrastructure since 2015. What started as a simple Plex server has, over the past decade, morphed into something of a digital beast in its own right. After this 10-year journey through countless configurations, upgrades, and late-night troubleshooting sessions, I thought it was time to share some of my experiences, the common pitfalls I've stumbled into, and everything I've learned along the way.

My current setup runs on dedicated hardware that's evolved significantly from those early days:

## Hardware Configuration

**[ Main Server ]**
- CPU: AMD Ryzen 3500x
- RAM: DDR4 32 GB (4x 8 GB)
- GPU: Nvidia 1660 Super OC Edition 
- Motherboard: MSI B450 Tomahawk Max 
- Storage: 1x 10TB HDD, 3x 8TB HDD, 512GB NVMe SSD

**[ Octoprint Server ]**
- Intel 10th gen Core i5 laptop (Huawei MateBook Pro repurposed)

**[ AdGuard Server ]** 
- Orange Pi Zero (because sometimes the smallest devices handle the biggest responsibilities)

## What's Actually Running

After a decade of experimentation, my homelab has settled into running a diverse ecosystem of services. Here's the complete breakdown of what's currently deployed:

| Category | Service | Purpose | Why It Matters |
|----------|---------|---------|----------------|
| **Core Infrastructure** | Homepage | Dashboard & Service Directory | Single pane of glass for everything |
| | Nginx | Reverse Proxy & SSL Termination | Clean URLs instead of port chaos |
| | Authelia | Single Sign-On Authentication | One login for everything |
| | LLDAP | User Directory | Centralized user management |
| | Portainer | Container Management | Visual Docker interface |
| | Dozzle | Real-time Log Viewer | Debug containers without SSH |
| **Media Streaming** | Plex | Media Server (Primary) | Polished streaming experience |
| | Jellyfin | Media Server (Secondary) | Open-source alternative |
| | Navidrome | Music Streaming | Personal Spotify replacement |
| **Photo Management** | Immich | Photo & Video Library | Google Photos alternative |
| **Entertainment Tools** | Overseerr | Media Request Management | Family-friendly request system |
| | Jellyseerr | Alternative Request Manager | Jellyfin-focused requests |
| **Home Automation** | Home Assistant | IoT Hub & Automation | Smart home brain |
| | N8N | Workflow Automation | Personal automation engine |
| | Frigate | AI Security Cameras | Smart surveillance with object detection |
| | NTFY | Push Notifications | Custom alerts and updates |
| **Document Management** | Paperless-NGX | Document Digitization | Paperless office solution |
| | Docmost | Team Documentation | Internal wiki and knowledge base |
| | NocoDB | Database Interface | Airtable alternative |
| **Personal Productivity** | Vaultwarden | Password Manager | Bitwarden server |
| | Linkwarden | Bookmark Manager | Centralized link collection |
| | Memos | Quick Notes | Personal note-taking |
| | Actual Budget | Financial Management | Privacy-focused budgeting |
| | Wallos | Subscription Tracker | Know what you're paying for |
| **Utilities** | Stirling PDF | PDF Tools | Document processing |
| | CyberChef | Data Analysis | Swiss army knife for data |
| | Change Detection | Website Monitoring | Track changes across the web |
| | FileFlows | Media Processing | Automated file workflows |
| **Development** | Open WebUI | AI Chat Interface | Local ChatGPT alternative |
| | Atuin | Shell History Sync | Command history across devices |
| **Gaming** | PufferPanel | Game Server Management | Minecraft and friends |
| **Media Management** | *arr Stack | Automated Media Collection | Managing thousands of movies and TV shows |

The beauty of this setup isn't just in the individual services, but in how they work together. Overseerr talks to the media services, Home Assistant triggers N8N workflows, and everything shares the same authentication system. It's become less of a collection of tools and more of an integrated digital ecosystem.

In this first part, we'll explore how these services complement each other and why each one earned its place in my infrastructure. The foundational architecture – the networking, security, and orchestration that makes it all possible – will be the focus of part two, where we'll dig into the technical decisions that keep everything running smoothly.

## What's Coming Next

This series will unfold across three detailed posts:

1. **Part 1: The Service Ecosystem** (This post) - Understanding what runs and why
2. **Part 2: Foundation Architecture** - Networking, security, and service discovery 
3. **Part 3: Advanced Operations** - Scaling, monitoring, and maintenance

Let's dive into the world of self-hosted services and see what a decade of iteration has taught me about building resilient home infrastructure.