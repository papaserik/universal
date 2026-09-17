module.exports = {
  apps: [{
    name: 'universal-shop',
    script: 'server.js',
    instances: 'max',            // = кол-во ядер CPU
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLUSTER: '1',
      LOG_LEVEL: 'info',
    },
    error_file: '/var/log/universal/error.log',
    out_file:   '/var/log/universal/out.log',
    merge_logs: true,
    time: true,
  }],
};
