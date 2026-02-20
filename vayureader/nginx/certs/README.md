# SSL Certificates

To run Nginx with HTTPS locally or in production, you need SSL certificates.

## For Local Development (Self-Signed)

Run this command in this directory (requires OpenSSL):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```
Skip through the prompts (or fill them). This will generate:
- `server.key`: The private key.
- `server.crt`: The public certificate.

## For Production

Replace `server.key` and `server.crt` with your actual authority-signed certificate files (e.g., from Let's Encrypt or your CA).

**Note:** The `docker-compose.yml` mounts this directory to `/etc/nginx/certs` in the Nginx container.
