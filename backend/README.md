# AI Newsreader Backend

This is a simple Flask server designed to fetch and parse web articles. It uses the `newspaper3k` library to extract the main content from a given URL.

## Setup on a Debian VPS

These instructions assume you have a minimal Debian server with `python3` and `pip` installed.

### 1. Install Dependencies

First, install the necessary system packages.

```bash
sudo apt-get update
sudo apt-get install python3-pip python3-venv libxml2-dev libxslt1-dev
```

### 2. Clone the Repository & Prepare Server File

Clone the project repository onto the server. The Python server code is provided in `backend.txt` for compatibility and must be renamed to `server.py` to be executable.

```bash
git clone https://github.com/LordJABA/StudioAINewsreader2.git
cd StudioAINewsreader2/backend
mv backend.txt server.py
```

### 3. Set Up Python Virtual Environment

It's best practice to use a virtual environment to manage dependencies.

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configure the Secret Key

The server is secured with a secret key to prevent unauthorized access. Generate a strong, random key. You can use this command to generate one:

```bash
python3 -c 'import secrets; print(secrets.token_hex(32))'
```

Copy the generated key. Now, set it as an environment variable. For production, it's best to add this to your shell's startup file (like `~/.bashrc` or `~/.profile`) or a systemd service file.

```bash
# Add this line to ~/.bashrc or ~/.profile. Replace the placeholder with your actual key.
export BACKEND_SECRET_KEY='your_super_secret_key_here'

# Then reload your shell
source ~/.bashrc
```

### 5. Run the Server with Gunicorn

`gunicorn` is a production-ready WSGI server for Python. Before running, you should configure your firewall.

```bash
# Make sure you are in the 'backend' directory and your virtual env is active
gunicorn --bind 0.0.0.0:5000 server:app
```

### 5a. Test Server Accessibility

After starting the server, you can test if it's accessible from the internet. Open your web browser and navigate to `http://<your_vps_ip>:5000`.

-   **If you see a success message** ("AI Newsreader Backend is Running!"), then your firewall is open, and the server is working. Any "Failed to fetch" errors in the frontend are likely due to an incorrect URL or Secret Key in the settings.
-   **If the page times out or fails to load**, it confirms that something is blocking the connection. The most common cause is the firewall on your VPS. Please proceed to the next step to configure it. SSH access (port 22) is separate and does not guarantee that other ports are open.


### 6. Configure Firewall

**This is a critical step.** A "Failed to fetch" error in the frontend application is the most common symptom of a misconfigured firewall.

Most VPS providers have a firewall enabled by default that will block incoming connections. You need to allow traffic on the port your application is running on (e.g., 5000).

If you are using `ufw` (Uncomplicated Firewall), common on Debian/Ubuntu, you can allow traffic with this command:

```bash
sudo ufw allow 5000/tcp
```

After running this, you should enable the firewall (if it's not already) and check the status to ensure the rule was added:

```bash
sudo ufw enable
sudo ufw status
```

**Note:** If you are using a cloud provider like AWS, GCP, or Azure, you may need to configure the firewall rules in their web console (e.g., "Security Groups" on AWS, "VPC network -> Firewall" on GCP).

### 7. (Recommended) Run as a Systemd Service

For the server to run persistently and restart on boot, you should run it as a `systemd` service.

Create a service file:
```bash
sudo nano /etc/systemd/system/newsreader-backend.service
```

Paste the following content, making sure to replace `your_username`, `/path/to/your/StudioAINewsreader2/clone`, and `your_super_secret_key_here` with your actual values.

```ini
[Unit]
Description=Gunicorn instance for AI Newsreader Backend
After=network.target

[Service]
User=your_username
Group=www-data
WorkingDirectory=/path/to/your/StudioAINewsreader2/clone/backend
Environment="PATH=/path/to/your/StudioAINewsreader2/clone/backend/venv/bin"
Environment="BACKEND_SECRET_KEY=your_super_secret_key_here"
ExecStart=/path/to/your/StudioAINewsreader2/clone/backend/venv/bin/gunicorn --workers 3 --bind unix:newsreader-backend.sock -m 007 server:app

[Install]
WantedBy=multi-user.target
```

Now, enable and start the service:

```bash
sudo systemctl start newsreader-backend
sudo systemctl enable newsreader-backend

# To check the status:
sudo systemctl status newsreader-backend
```

You would then typically set up a reverse proxy like Nginx to handle incoming requests and forward them to the Gunicorn socket.