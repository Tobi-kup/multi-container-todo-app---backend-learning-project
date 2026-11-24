# Multi-Container Todo-App

Ein Lernprojekt: eine kleine Todo-API (Node.js, Express, MongoDB), mit der ich Docker Compose, Server-Einrichtung mit Ansible und Terraform sowie eine CI/CD-Pipeline mit GitHub Actions ausprobiert habe. Die App selbst ist bewusst simpel gehalten, im Mittelpunkt stehen der Betrieb und die Automatisierung.

## Was das Projekt macht

Die API verwaltet Todos (anlegen, lesen, ändern, löschen) und speichert sie in MongoDB. API und Datenbank laufen als zwei Container und werden mit Docker Compose gestartet. Bei jedem Push auf `main` baut GitHub Actions ein neues Image, lädt es zu Docker Hub und aktualisiert die laufenden Container automatisch.

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/todos` | alle Todos |
| `POST` | `/todos` | Todo anlegen |
| `GET` | `/todos/:id` | ein Todo abrufen |
| `PUT` | `/todos/:id` | Todo ändern |
| `DELETE` | `/todos/:id` | Todo löschen |
| `GET` | `/health` | Health-Check für die Pipeline |

Es gibt bewusst keine Authentifizierung.

## Aufbau

```
src/                      API (Express, Mongoose)
Dockerfile                zwei Stages: development und production
docker-compose.yml        lokale Entwicklung (nodemon, Bind Mount)
docker-compose.prod.yml   Betrieb mit dem fertigen Image von Docker Hub
ansible/                  richtet den Server ein
terraform/                Beschreibung eines DigitalOcean-Servers
.github/workflows/        CI/CD-Pipeline
```

```
git push -> GitHub Actions baut das Image -> Docker Hub
                                                |
              Self-hosted Runner (mein Server) <-+
              docker compose pull && up -d
```

## Entscheidungen

- **Zwei Compose-Dateien:** Lokal baue ich das Image selbst und binde `./src` ein, damit nodemon bei Änderungen neu startet. Im Betrieb kommt das fertige Image aus Docker Hub, ohne Bind Mount und ohne nodemon.
- **Zwei Stages im Dockerfile:** Das Produktions-Image enthält keine Entwicklungspakete und ist dadurch kleiner.
- **Datenbank nicht nach außen veröffentlicht:** Im Betrieb erreicht nur die API den Mongo-Container, weil die Datenbank keine Anmeldung hat.
- **Named Volume für Mongo:** Die Daten überleben `docker compose down`. Nur `down -v` löscht sie.
- **Lokaler Server statt Cloud:** Um keine Kosten zu verursachen, ist der "Server" ein Ubuntu in WSL2. Ansible richtet es genauso ein wie einen echten Server.
- **Self-hosted Runner:** Er läuft auf meinem Rechner und holt Deploy-Aufträge bei GitHub ab, deshalb braucht der Rechner keine öffentliche IP.

## Lokal starten

```bash
docker compose up --build
```

Die API läuft dann auf <http://localhost:3000>. Daten bleiben bei `docker compose down` erhalten.

## Stand und Grenzen

- **Terraform** ist geschrieben und mit `terraform validate` geprüft, aber nie mit `apply` angewendet, weil ein Cloud-Server Geld kostet.
- Die Pipeline funktioniert nur, solange der Runner auf meinem Rechner läuft.
- Es gibt keine automatisierten Tests, die Pipeline prüft nur über `/health`, ob die API nach dem Deployment antwortet.

### Beispiele der Nutzung der Todo-App (PowerShell)
 
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
