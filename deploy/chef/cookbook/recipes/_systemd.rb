systemd_service 'clientcomm' do
  description 'Clientcomm web process'
  after %w[network.target]
  install do
    wanted_by 'multi-user.target'
  end
  service do
    exec_start '/usr/local/bin/node app/app.js'
    working_directory '/home/clientcomm/clientcomm'
    user 'clientcomm'
    group 'clientcomm'
  end

  action [:create, :enable]
end
