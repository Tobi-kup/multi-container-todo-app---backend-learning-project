output "server_ip" {
  description = "Öffentliche IP-Adresse des Servers"
  value       = digitalocean_droplet.app.ipv4_address
}