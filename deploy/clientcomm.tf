// This is a terraform definition for an AWS configuration of clientcomm.
// See the README.md for more details on how to use this.

provider "aws" {
  region = "us-west-2"
}

// Specify this with an environment variable, something like:
// export TF_VAR_ssh_public_key_path=~/.ssh/clientcomm.pub
variable "ssh_public_key_path" {
  description = "The path to your SSH public key"
}

resource "aws_vpc" "clientcomm" {
  cidr_block = "10.0.0.0/16"
}

// ////////////////////////////////////////////////////////////////////////////
// NETWORKING
// ////////////////////////////////////////////////////////////////////////////
// Create a subnet to contain our web servers
resource "aws_subnet" "clientcomm_web" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  map_public_ip_on_launch = true
  cidr_block = "10.0.1.0/24"
}

// Allow access from the public internet to key web ports - 22, 80, 443
resource "aws_security_group" "clientcomm_allow_web" {
  name = "ClientComm Allow Web"
  description = "Allow 80/443 to our web servers"
  vpc_id = "${aws_vpc.clientcomm.id}"

  // TODO: restrict to CfA network?
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  // From the Terraform docs:
  // https://www.terraform.io/docs/providers/aws/r/security_group.html
  // "By default, AWS creates an ALLOW ALL egress rule when creating a new
  // Security Group inside of a VPC. When creating a new Security Group inside
  // a VPC, Terraform will remove this default rule, and require you
  // specifically re-create it if you desire that rule."
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

// An internet gateway is necessary for traffic to exit the VPC.
resource "aws_internet_gateway" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  tags = {
    Name = "clientcomm"
  }
}

// A route table is necessary for the VPC to know to send traffic to the
// gateway.
resource "aws_route_table" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.clientcomm.id}"
  }
}

// We must configure our subnets to use the route table rather than a
// created-by-default one that doesn't have a public route.
resource "aws_route_table_association" "clientcomm" {
  subnet_id = "${aws_subnet.clientcomm_web.id}"
  route_table_id = "${aws_route_table.clientcomm.id}"
}

// ////////////////////////////////////////////////////////////////////////////
// COMPUTE
// ////////////////////////////////////////////////////////////////////////////
// Superuser credentials for the created server.
resource "aws_key_pair" "clientcomm_deployer" {
  key_name = "clientcomm_deployer"
  public_key = "${file(var.ssh_public_key_path)}"
}

resource "aws_instance" "clientcomm_web" {
  ami = "ami-d206bdb2"
  instance_type = "t2.micro"
  subnet_id = "${aws_subnet.clientcomm_web.id}"
  vpc_security_group_ids = ["${aws_security_group.clientcomm_allow_web.id}"]
  key_name = "${aws_key_pair.clientcomm_deployer.key_name}"
}

// TODO: Get this working by maybe manually building the provider
// resource "twilio_phonenumber" "clientcomm" {
//   location {
//     near_lat_long {
//       latitude = 45.5231
//       longitude = -122.6765
//     }
//   }
// }
