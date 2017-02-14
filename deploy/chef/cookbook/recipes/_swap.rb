# These resources enable swap on the server.
#
# This should not be necessary on more powerful instance types, but on
# t2.micro/t2.small instances, compiling node modules often runs the machine out
# of memory.
execute 'sudo fallocate -l 1G /swap' do
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
