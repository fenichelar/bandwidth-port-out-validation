module.exports = {
  apps : [
    {
      name: 'bandwidth-port-out-validation',
      script: './index.js',
      exec_mode: 'cluster',
      instances: 2,
      error_file: 'error.log',
      out_file: 'output.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
