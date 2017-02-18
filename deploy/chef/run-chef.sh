#!/bin/bash
# usage: ./run-chef.sh
# This script wraps the initial Chef setup installation/logic and cookbook
# uploading necessary to run Chef. In a full-blown Chef deployment this is
# handled by a Chef server, but here it is a lot simpler to just do by hand.
set -euo pipefail

terraform_dir=$(cd $(dirname $0)/..; pwd)

cd $(dirname $0)

run_node() {
  ip=$1
  SSH="ssh ubuntu@$ip"

  echo "Installing Chef on ${ip}..."
  $SSH 'if [ ! $(which chef-solo) ]; then curl -L https://www.chef.io/chef/install.sh | sudo bash; fi'

  echo "Installing /etc/chef/solo.rb"
  cookbooks_dir=/data/chef/cookbook
  chef_attributes=$(cat <<JSON
{
  "clientcomm": {
    "deploy_base_url": "${TF_VAR_deploy_base_url}"
  }
}
JSON
)

  $SSH /bin/bash -c "\"
  sudo mkdir -p /etc/chef/ ${cookbooks_dir};
  echo '
    cookbook_path \\\"${cookbooks_dir}\\\"
    json_attribs \\\"/etc/chef/attributes.json\\\"
  ' | sudo tee /etc/chef/solo.rb >/dev/null
  \""
  echo $chef_attributes | $SSH sudo tee /etc/chef/attributes.json >/dev/null

  echo "Packaging cookbooks"
  berks package clientcomm.tar.gz

  echo "Uploading cookbooks"
  $SSH sudo rm -rf "${cookbooks_dir}/*"
  cat clientcomm.tar.gz | $SSH sudo tar xz --strip-components=1 -C "${cookbooks_dir}"
  trap "rm -f clientcomm.tar.gz" EXIT

  echo "Running chef..."
  $SSH 'sudo chef-solo --config /etc/chef/solo.rb -o "recipe[clientcomm]"'
}

for IP in $(terraform output -json -state $terraform_dir/terraform.tfstate web_ip | jq -r '.value[]'); do
  run_node "$IP"
done
