// Bundled examples keep command lookup instant and never send input to a server.
export const cheatSheets: Record<string, string> = {
  curl: `# Download a file
curl <url>

# Download and rename a file
curl <url> -o <outfile>

# Keep the remote filename
curl -O <url>

# Follow redirects and fail on HTTP errors
curl -fL <url>

# Inspect response headers
curl -I <url>

# Send JSON
curl -X POST -H 'Content-Type: application/json' -d '{"key":"value"}' <url>

# Download sequentially numbered files
curl -O 'https://example.com/pic[1-24].jpg'`,
  git: `# Inspect changes
git status
git diff
git diff --staged

# Create a branch
git switch -c <branch>

# Stage and commit a file
git add <file>
git commit -m '<message>'

# Inspect history
git log --oneline --graph

# Fetch remote changes
git fetch origin`,
  docker: `# List running containers and images
docker ps
docker images

# Start an isolated container
docker run --rm -it <image> <command>

# Build an image
docker build -t <name> .

# Inspect container logs
docker logs -f <container>

# Run a command inside a container
docker exec -it <container> sh`,
  kubectl: `# List resources
kubectl get pods -n <namespace>
kubectl get services -n <namespace>

# Inspect a resource
kubectl describe pod <pod> -n <namespace>

# Read logs
kubectl logs -f <pod> -n <namespace>

# Apply a manifest
kubectl apply -f <manifest.yaml>

# Forward a local port
kubectl port-forward service/<name> 8080:80 -n <namespace>`,
  openssl: `# Decode a PEM certificate
openssl x509 -noout -text -in <certificate.pem>

# Check certificate validity and identity
openssl x509 -noout -dates -subject -issuer -in <certificate.pem>

# Inspect a server certificate (including SNI)
openssl s_client -connect <host>:443 -servername <host> -showcerts

# Compute SHA-256
openssl dgst -sha256 <file>`,
  tar: `# Create a gzip archive
tar -czf <archive.tar.gz> <directory>

# List archive contents
tar -tzf <archive.tar.gz>

# Extract to a directory
tar -xzf <archive.tar.gz> -C <directory>`,
  jq: `# Pretty-print JSON
jq . <file.json>

# Read a property
jq '.name' <file.json>

# Print strings without quotes
jq -r '.name' <file.json>

# Filter array entries
jq '.[] | select(.enabled == true)' <file.json>

# Select properties
jq '{name, version}' <file.json>`,
  ssh: `# Connect to a remote host
ssh <user>@<host>

# Use a specific private key
ssh -i <keyfile> <user>@<host>

# Run a remote command
ssh <user>@<host> '<command>'

# Forward a local port
ssh -L 8080:localhost:80 <user>@<host>`,
};

export const cheatSheetTopics = Object.keys(cheatSheets);
