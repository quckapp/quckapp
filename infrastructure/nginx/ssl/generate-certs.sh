#!/bin/bash
# Generate self-signed SSL certificates for development
# Run: chmod +x generate-certs.sh && ./generate-certs.sh

DOMAIN="quikapp.local"
DAYS=365

echo "Generating self-signed SSL certificates for $DOMAIN..."

# Generate private key
openssl genrsa -out server.key 2048

# Generate certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=QuikApp/OU=Development/CN=$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -days $DAYS -in server.csr -signkey server.key -out server.crt

# Create fullchain (for compatibility)
cp server.crt fullchain.pem
cp server.key privkey.pem

# Clean up CSR
rm server.csr

echo "SSL certificates generated successfully!"
echo "Files created:"
echo "  - server.crt (certificate)"
echo "  - server.key (private key)"
echo "  - fullchain.pem (certificate chain)"
echo "  - privkey.pem (private key alias)"
