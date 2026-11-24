variable "do_token" {
  description = "DigitalOcean API-Token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Pfad zum öffentlichen SSH-Schlüssel"
  type        = string
}

variable "region" {
  description = "Rechenzentrum"
  type        = string
  default     = "fra1"
}

variable "droplet_size" {
  description = "Servergröße"
  type        = string
  default     = "s-1vcpu-1gb"
}