// This is a terraform definition for an AWS configuration of clientcomm.
// See the README.md for more details on how to use this.

provider "aws" {
  region = "us-west-2"
}

variable "ssh_public_key_path" {
  description = "The path to your SSH public key"
}

resource "aws_vpc" "clientcomm" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "clientcomm_web" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  map_public_ip_on_launch = true
  cidr_block = "10.0.1.0/24"
}

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
}

resource "aws_internet_gateway" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  tags = {
    Name = "clientcomm"
  }
}

resource "aws_route_table" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.clientcomm.id}"
  }
}

resource "aws_route_table_association" "clientcomm" {
  subnet_id = "${aws_subnet.clientcomm_web.id}"
  route_table_id = "${aws_route_table.clientcomm.id}"
}

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
