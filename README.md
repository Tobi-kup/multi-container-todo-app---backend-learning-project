# Multi-Container Todo-App

Eine einfache Todo-API (Node.js, Express, MongoDB), die mit Docker Compose betrieben wird. Das Projekt ist ein Lernprojekt: Es zeigt den Weg von der lokalen Entwicklung bis zur automatischen Auslieferung mit einer CI/CD-Pipeline.

## Inhalt

- [Überblick](#überblick)
- [Projektstruktur](#projektstruktur)
- [API](#api)
- [Lokal entwickeln](#lokal-entwickeln)
- [Produktion](#produktion)
- [Server einrichten (Ansible)](#server-einrichten-ansible)
- [Terraform](#terraform)
- [CI/CD-Pipeline](#cicd-pipeline)

## Überblick

| Baustein | Aufgabe |
|---|---|
| **Express** | REST-API für Todos |
| **Mongoose / MongoDB** | speichert die Todos |
| **Docker / Docker Compose** | startet API und Datenbank als Container |
| **Docker Hub** | Ablage des fertigen Produktions-Images |
| **Ansible** | richtet den Server ein (Docker, Compose, Start der Container) |
| **Terraform** | beschreibt einen Cloud-Server (DigitalOcean) |
| **GitHub Actions** | baut, lädt hoch und deployt bei jedem Push auf `main` |

Ablauf der Auslieferung:

```
git push  ->  GitHub Actions baut das Image  ->  Docker Hub
                                                    |
                  Self-hosted Runner (Server)  <----+
                  docker compose pull && up -d
```

## Projektstruktur

```
.
├── src/
│   ├── index.js            # Einstiegspunkt: Express-App, Mongo-Verbindung
│   ├── models/todo.js      # Mongoose-Schema für Todos
│   └── routes/todos.js     # Routen für /todos
├── ansible/
│   ├── inventory.ini       # Zielrechner (localhost)
│   └── playbook.yml        # richtet den Server ein
├── terraform/              # DigitalOcean-Server (optional)
├── .github/workflows/
│   └── deploy.yml          # CI/CD-Pipeline
├── Dockerfile              # zwei Stages: development und production
├── docker-compose.yml      # lokale Entwicklung
├── docker-compose.prod.yml # Produktion (Image von Docker Hub)
└── package.json
```

## API

Die API hat keine Authentifizierung. Ein Todo hat diese Felder:

| Feld | Typ | Hinweis |
|---|---|---|
| `title` | String | Pflichtfeld |
| `description` | String | optional, Standard: leer |
| `completed` | Boolean | Standard: `false` |
| `_id`, `createdAt`, `updatedAt` | | werden automatisch gesetzt |

| Methode | Pfad | Beschreibung | Erfolgscode |
|---|---|---|---|
| `GET` | `/todos` | alle Todos, neueste zuerst | 200 |
| `POST` | `/todos` | Todo anlegen | 201 |
| `GET` | `/todos/:id` | ein Todo abrufen | 200 |
| `PUT` | `/todos/:id` | Todo ändern | 200 |
| `DELETE` | `/todos/:id` | Todo löschen | 204 |
| `GET` | `/health` | Health-Check (für die Pipeline) | 200 |

Fehlerfälle: `400` bei ungültigen Daten oder einer ungültigen ID, `404` wenn das Todo nicht existiert.

### Beispiele (PowerShell)

```powershell
# Anlegen
$todo = Invoke-RestMethod -Method Post -Uri http://localhost:3000/todos `
  -ContentType "application/json" `
  -Body (@{ title = "Milch kaufen" } | ConvertTo-Json)

# Alle anzeigen
Invoke-RestMethod http://localhost:3000/todos

# Eines abrufen
Invoke-RestMethod http://localhost:3000/todos/$($todo._id)

# Als erledigt markieren
Invoke-RestMethod -Method Put -Uri http://localhost:3000/todos/$($todo._id) `
  -ContentType "application/json" `
  -Body (@{ completed = $true } | ConvertTo-Json)

# Löschen
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/todos/$($todo._id)
```

### Beispiele (curl, Linux/macOS)

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Milch kaufen"}'
curl http://localhost:3000/todos
```

## Lokal entwickeln

Voraussetzung: Docker Desktop.

```bash
docker compose up --build
```

- Die API läuft auf <http://localhost:3000>.
- `./src` ist per Bind Mount im Container eingebunden, `nodemon` startet die API bei Änderungen neu (mit `-L`, damit das unter Windows funktioniert).
- Die Daten liegen im Volume `mongo_data` und bleiben bei `docker compose down` erhalten.

```bash
docker compose down        # stoppen, Daten bleiben
docker compose down -v     # stoppen und Daten löschen
docker compose logs -f api # Ausgaben der API
```

## Produktion

`docker-compose.prod.yml` nutzt das fertige Image von Docker Hub statt es zu bauen. Es gibt keinen Bind Mount und kein nodemon. Die Datenbank ist nicht nach außen veröffentlicht, nur die API erreicht sie.

Image von Hand bauen und hochladen:

```bash
docker build --target production -t DEINNAME/todo-api:latest .
docker login
docker push DEINNAME/todo-api:latest
```

Produktions-Stack lokal testen:

```powershell
$env:DOCKERHUB_USERNAME = "DEINNAME"
docker compose -f docker-compose.prod.yml up -d
```

## Server einrichten (Ansible)

Das Playbook installiert Docker und das Compose-Plugin, legt `/opt/todo-api` an, schreibt die `.env`-Datei, zieht das Image und startet die Container. Es lässt sich beliebig oft ausführen (idempotent).

Ansible läuft unter Windows nicht direkt, deshalb wird WSL2 mit Ubuntu 24.04 genutzt (mit aktiviertem systemd). Der Server ist in dieser Variante das Ubuntu selbst.

```bash
sudo apt install -y ansible
cd "/mnt/d/Projekte/Multi-Container Todo List App/ansible"
ansible-playbook -i inventory.ini playbook.yml -K -e dockerhub_username=DEINNAME
```

- `-K` fragt nach dem `sudo`-Passwort.
- Für einen echten Server trägt man dessen IP und SSH-Zugang im Inventory ein.

Prüfen:

```bash
docker ps
curl http://localhost:3000/health
```

## Terraform

Im Ordner `terraform/` steht die Beschreibung eines DigitalOcean-Servers (Droplet, SSH-Schlüssel, Firewall). In diesem Projekt wurde sie nur geprüft und nicht angewendet, weil ein Cloud-Server Kosten verursacht.

```bash
cd terraform
terraform init
terraform validate
```

Ein Server entsteht erst mit `terraform apply`, wofür ein DigitalOcean-API-Token in `terraform.tfvars` nötig ist (Datei steht in der `.gitignore` und darf nie eingecheckt werden). Danach `terraform destroy`, um Kosten zu vermeiden.

## CI/CD-Pipeline

Die Datei `.github/workflows/deploy.yml` läuft bei jedem Push auf `main` und besteht aus zwei Jobs:

1. **build** (GitHub-Runner): baut das Image mit `target: production` und lädt es zu Docker Hub, getaggt mit `latest` und der Commit-Prüfsumme.
2. **deploy** (Self-hosted Runner): setzt `IMAGE_TAG` in `/opt/todo-api/.env`, führt `docker compose pull` und `up -d` aus und prüft `/health`.

### Einmalige Einrichtung

**Secrets** (GitHub: *Settings → Secrets and variables → Actions*):

| Name | Wert |
|---|---|
| `DOCKERHUB_USERNAME` | Docker-Hub-Benutzername (klein geschrieben) |
| `DOCKERHUB_TOKEN` | Docker-Hub-Access-Token mit *Read & Write* |

**Self-hosted Runner** (GitHub: *Settings → Actions → Runners → New self-hosted runner*, Linux x64): die dort angezeigten Befehle im Ubuntu ausführen. Der Runner-Benutzer braucht Zugriff auf Docker und den App-Ordner:

```bash
sudo usermod -aG docker $USER
sudo chown -R $USER /opt/todo-api
```

Danach WSL neu starten (`wsl --shutdown` in PowerShell) und den Runner starten:

```bash
cd ~/actions-runner
./run.sh
```

Optional als Dienst, damit er im Hintergrund läuft:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Ist der Runner nicht aktiv, bleibt der Job `deploy` bei "Waiting for a runner" stehen.
