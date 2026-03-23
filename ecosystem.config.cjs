module.exports = {
  apps: [{
    name: 'blochub',
    script: 'node_modules/.bin/next',
    args: 'start -p 3011',
    cwd: '/var/www/blochub',
    env: {
      NODE_ENV: 'production',
      PORT: 3011
    },
    max_memory_restart: '512M',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    error_file: '/var/log/pm2/blochub-error.log',
    out_file: '/var/log/pm2/blochub-out.log',
    merge_logs: true,
    time: true
  }]
}
