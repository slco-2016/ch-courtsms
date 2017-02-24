include_recipe 'clientcomm::_user'
include_recipe 'clientcomm::_swap'
include_recipe 'clientcomm::_nginx'
include_recipe 'clientcomm::_nodejs'
include_recipe 'clientcomm::_clientcomm'

# fix 'sudo: unable to resolve host ip-10-0-0-132' error
execute 'fix sudo hostname bug' do
  command "echo '127.0.0.1 #{node['hostname']}' | sudo tee -a /etc/hosts"
  not_if "grep '127.0.0.1 #{node['hostname']}' /etc/hosts"
end
