# Windows Modernization Lab

This project aims to provide a controlled lab environment to explore the Windows Modernization tools and solutions on AWS.

## Components

The content of this project uses on AWS Cloud Development Kit (CDK) to define the infreastructure and execute automations. When executed, this will create the following resources:

- Dedicated VPC
- EC2 Instances running Microsoft Windows Server 2019
    - **Features/Roles:** IIS and ASP.NET
    - **Runtimes:** .NET Core 3.1 SDK, .NET 6.0 SDK
    - **Tools:** Choco, Git, VS2022 Community, VS Build Tools, VSCode and Firefox
    - **Connectivity:** Allowing HTTP/80 (any) and RDP (allowed CIDR)
- Amazon RDS running Microsoft SQL Server (Standard Edition)
    - **License:** included
    - **Credentials:** labuser / labpasswd
    - **Connectivity:** Allowing from EC2 Instances running Microsoft Windows Server 2019

## Prerequisites

For use this project, you need:

- AWS Command Line Interface (CLI) v2 configured ([docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html))
- AWS Cloud Development Kit (CDK) v2 installed ([docs](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html))

## How to use?

```shell
git clone https://github.com/davivcgarcia/windows-modernization-lab.git
cd windows-modernization-lab
npm install
cdk bootstrap
cdk deploy --parameters WinModServerKeyname=<ec2_keypair_name> \
           --parameters WinModServerAllowedCIDR=<your ip /32>
```

