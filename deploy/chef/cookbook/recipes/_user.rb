user 'clientcomm' do
  comment 'ClientComm user'
  home '/home/clientcomm'
  shell '/bin/bash'
  manage_home true
end

directory '/home/clientcomm/.ssh' do
  mode 0700
  owner 'clientcomm'
  group 'clientcomm'
end

file '/home/clientcomm/.ssh/authorized_keys' do
  mode 0600
  owner 'clientcomm'
  group 'clientcomm'
  content <<-FILE
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDRO/K8hOlNKvhaEiK3cRA5dWxXWu4c/onbH9vMxxooXN1ac+Jd4PJpM8c7k517sdqBqRbgMH/Bftr3bWfHOxzDy06The5Xe2fDLc/JulZxgaW6Jia5gz+5GQYnWPmUwIIBFJxWFyCkIWx8Mpm4icHr13IyzG/yqBTAbtNWww8QOdX8viec7Kdc1IJkSMMwKgXjUKpitks0eYCIlC/HQkVrRqpyxskFkN8psfTu3HbgnPfrSpTtgdwNSudkkm7Q2sRrgHbvfDxUjTPb+xD5z1X5eXTL5mj0PT0oIk69aE70ewKCdx+JkTK/+521CRS3FKdaD7sVc0tAvwLSeL1QM6dl Tom@Toms-MacBook-Pro.local
FILE
end

sudo 'clientcomm' do
  user 'clientcomm'
  commands [
    '/bin/systemctl restart clientcomm',
    '/bin/systemctl restart clientcomm-worker',
  ]
  nopasswd true
end
