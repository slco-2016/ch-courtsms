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

execute 'npm install' do
  user 'clientcomm'
  cwd '/home/clientcomm/clientcomm'
  environment(
    HOME: '/home/clientcomm',
  )
  action :nothing
end
