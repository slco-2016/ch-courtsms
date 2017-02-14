execute 'sudo fallocate -l /swap' do
  not_if 'swapon --show | grep /swap'

  notifies :run, 'execute[sudo mkswap /swap]', :immediately
end

execute 'sudo mkswap /swap' do
  action :nothing

  notifies :run, 'execute[sudo swapon /swap]', :immediately
end

execute 'sudo swapon /swap' do
  action :nothing
end

file '/swap' do
  mode 0600
end
