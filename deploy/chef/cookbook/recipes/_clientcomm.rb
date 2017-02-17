git '/home/clientcomm/clientcomm' do
  repository 'https://github.com/slco-2016/clientcomm.git'

  # TODO: make this a bare repo and update the deploy script extract a given SHA
  # with `git archive` as capistrano does.
  revision 'master'

  user 'clientcomm'
  group 'clientcomm'

  notifies :run, 'execute[npm install]', :immediately
end

cookbook_file '/home/clientcomm/clientcomm/credentials.js'

execute 'mv /home/ubuntu/clientcomm.conf /etc/clientcomm.conf' do
  only_if '[ -f /home/ubuntu/clientcomm.conf ]'
end

package 'postgresql-client-9.5'

execute 'npm install' do
  user 'clientcomm'
  cwd '/home/clientcomm/clientcomm'
  environment(
    HOME: '/home/clientcomm',
  )
  action :nothing
end

systemd_service 'clientcomm' do
  description 'Clientcomm web process'
  after %w[network.target]
  install do
    wanted_by 'multi-user.target'
  end
  service do
    environment_file '/etc/clientcomm.conf'
    exec_start '/usr/local/bin/node app/server.js'
    working_directory '/home/clientcomm/clientcomm'
    user 'clientcomm'
    group 'clientcomm'
    restart 'on-failure'
    restart_sec '10s'
  end

  action [:create, :enable, :start]
end

systemd_service 'clientcomm-worker' do
  description 'Clientcomm background worker'
  after %w[network.target]
  install do
    wanted_by 'multi-user.target'
  end
  service do
    environment_file '/etc/clientcomm.conf'
    environment(
      RUNSCHEDULED: true
    )
    # Don't run 'server.js' to prevent contention of the same TCP port
    exec_start '/usr/local/bin/node app/app.js'
    working_directory '/home/clientcomm/clientcomm'
    user 'clientcomm'
    group 'clientcomm'
    restart 'on-failure'
    restart_sec '10s'
  end

  # Start this on only one web node
  action [:create]
end
