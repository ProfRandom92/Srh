# 🚀 Srh Deployment Guide

Dieser Leitfaden erklärt, wie Sie das Srh Such-Tool in verschiedenen Umgebungen deployen können.

## 📋 Voraussetzungen

### Minimale Systemanforderungen
- **CPU**: 1 vCPU (2+ empfohlen)
- **RAM**: 512 MB (1GB+ empfohlen)
- **Storage**: 5GB freier Speicherplatz
- **OS**: Linux, macOS, Windows (mit Docker)

### Software-Anforderungen
- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (für SSL-Zertifikate)

## 🏗️ Deployment-Optionen

### 1. Docker Compose (Empfohlen)

#### Schnell-Start
```bash
# Repository klonen
git clone <repository-url>
cd srh

# Deployment ausführen
chmod +x deploy.sh
./deploy.sh production
```

#### Manuelle Konfiguration
```bash
# Environment-Datei erstellen
cp .env.example .env
nano .env  # Konfiguration anpassen

# SSL-Zertifikate hinzufügen (Production)
mkdir ssl
# Ihre SSL-Zertifikate nach ssl/cert.pem und ssl/key.pem kopieren

# Services starten
docker-compose up -d

# Status prüfen
docker-compose ps
curl http://localhost:3000/api/health
```

### 2. Kubernetes Deployment

#### Basis-Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srh-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: srh
  template:
    metadata:
      labels:
        app: srh
    spec:
      containers:
      - name: srh
        image: srh:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
---
apiVersion: v1
kind: Service
metadata:
  name: srh-service
spec:
  selector:
    app: srh
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 3. Cloud-Provider Spezifisch

#### AWS ECS
```bash
# ECR Repository erstellen
aws ecr create-repository --repository-name srh

# Image bauen und pushen
docker build -t srh .
docker tag srh:latest <account-id>.dkr.ecr.<region>.amazonaws.com/srh:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/srh:latest

# ECS Service deployment über AWS Console oder CLI
```

#### Google Cloud Run
```bash
# Cloud Build verwenden
gcloud builds submit --tag gcr.io/PROJECT-ID/srh

# Service deployen
gcloud run deploy srh \
  --image gcr.io/PROJECT-ID/srh \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

#### Azure Container Instances
```bash
# Container Registry
az acr build --registry myregistry --image srh .

# Container Instance
az container create \
  --resource-group myResourceGroup \
  --name srh-container \
  --image myregistry.azurecr.io/srh:latest \
  --dns-name-label srh-app \
  --ports 3000
```

## 🔧 Konfiguration

### Environment-Variablen (.env)

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Datenbank
DB_PATH=/app/data/srh.db

# Sicherheit
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
BCRYPT_ROUNDS=12

# CORS
FRONTEND_URL=https://your-domain.com

# Redis (Production)
REDIS_URL=redis://redis:6379

# Rate Limiting
SEARCH_RATE_LIMIT=30
API_RATE_LIMIT=100

# Logging
LOG_LEVEL=info
```

### SSL/TLS Setup

#### Let's Encrypt (Kostenlos)
```bash
# Certbot installieren
sudo apt-get install certbot

# Zertifikat erstellen
sudo certbot certonly --standalone -d your-domain.com

# Zertifikate kopieren
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Auto-Renewal einrichten
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

#### Self-Signed (Development)
```bash
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem \
  -days 365 -nodes -subj "/C=DE/ST=State/L=City/O=Organization/CN=localhost"
```

## 🔒 Sicherheit

### Produktions-Checkliste
- [ ] Starke JWT_SECRET gesetzt
- [ ] SSL/TLS aktiviert
- [ ] Rate Limiting konfiguriert
- [ ] Security Headers aktiviert
- [ ] Firewall konfiguriert
- [ ] Backup-Strategie implementiert
- [ ] Monitoring eingerichtet
- [ ] Log-Rotation konfiguriert

### Firewall-Regeln
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 📊 Monitoring & Logging

### Health Checks
```bash
# Application Health
curl http://localhost:3000/api/health

# Database Status
curl http://localhost:3000/api/data/stats

# Service Status
docker-compose ps
```

### Log-Management
```bash
# Container Logs anzeigen
docker-compose logs -f srh

# Log-Rotation einrichten
cat > /etc/logrotate.d/docker-srh << EOF
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
}
EOF
```

### Prometheus Monitoring (Optional)
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🔄 Backup & Recovery

### Datenbank-Backup
```bash
# Automatisches Backup-Script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec srh cp /app/data/srh.db /app/data/backup_${DATE}.db

# Backup extern speichern
docker cp $(docker-compose ps -q srh):/app/data/backup_${DATE}.db ./backups/
```

### Recovery
```bash
# Service stoppen
docker-compose down

# Backup wiederherstellen
docker cp ./backups/backup_YYYYMMDD_HHMMSS.db $(docker-compose ps -q srh):/app/data/srh.db

# Service starten
docker-compose up -d
```

## 🚀 Performance-Optimierung

### Database Tuning
```sql
-- SQLite Optimierungen
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;
```

### Nginx Caching
```nginx
# Cache-Konfiguration hinzufügen
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=srh_cache:10m max_size=1g inactive=60m;

location /api/data {
    proxy_cache srh_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
}
```

## 🔧 Troubleshooting

### Häufige Probleme

#### Service startet nicht
```bash
# Logs prüfen
docker-compose logs srh

# Container-Status prüfen
docker-compose ps

# Ports prüfen
netstat -tulpn | grep :3000
```

#### Datenbank-Probleme
```bash
# Datenbank-Integrität prüfen
docker-compose exec srh sqlite3 /app/data/srh.db "PRAGMA integrity_check;"

# Datenbank reparieren
docker-compose exec srh sqlite3 /app/data/srh.db ".recover /app/data/srh_recovered.db"
```

#### Performance-Probleme
```bash
# Resource-Verbrauch prüfen
docker stats

# Memory-Leak Detection
docker-compose exec srh node --inspect=0.0.0.0:9229 src/app.js
```

## 📞 Support

### Log-Level erhöhen
```bash
# .env anpassen
LOG_LEVEL=debug

# Container neustarten
docker-compose restart srh
```

### Debug-Modus
```bash
# Development-Mode starten
NODE_ENV=development docker-compose up

# Mit Debugger
docker-compose exec srh node --inspect-brk=0.0.0.0:9229 src/app.js
```

## 📈 Skalierung

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  srh:
    build: .
    deploy:
      replicas: 3
    
  nginx:
    image: nginx:alpine
    depends_on:
      - srh
    volumes:
      - ./nginx-loadbalancer.conf:/etc/nginx/nginx.conf
```

### Load Balancer Config
```nginx
upstream srh_cluster {
    least_conn;
    server srh_1:3000;
    server srh_2:3000;
    server srh_3:3000;
}
```

---

## 🎉 Deployment erfolgreich!

Nach einem erfolgreichen Deployment ist Srh unter folgenden URLs erreichbar:

- **Frontend**: https://your-domain.com
- **API**: https://your-domain.com/api
- **Health Check**: https://your-domain.com/api/health
- **Dokumentation**: https://your-domain.com/KONZEPT.md

Bei Fragen oder Problemen prüfen Sie die Logs oder kontaktieren Sie das Support-Team.