include_recipe 'nginx::package'

template '/etc/nginx/sites-available/clientcomm' do
  source 'nginx.conf.erb'

  notifies :reload, 'service[nginx]', :immediately
end

nginx_site 'clientcomm' do
  enable true
end
