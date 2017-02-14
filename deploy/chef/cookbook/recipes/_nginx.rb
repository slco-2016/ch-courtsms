include_recipe 'nginx::package'

cookbook_file '/etc/nginx/sites-available/clientcomm' do
  source 'nginx.conf'
end

nginx_site 'clientcomm' do
  enable true
end
