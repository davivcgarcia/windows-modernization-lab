import { CfnOutput, CfnParameter, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class WindowsModernizationLabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // CloudFormation stack parameters (inputs)

    const winModServerKey = new CfnParameter(this, 'WinModServerKeyname', {
      description: 'EC2 Keypair name to be used with the Windows Server instance (ex. work-default)'  
    });

    const winModServerAllowedCIDR = new CfnParameter(this, 'WinModServerAllowedCIDR', {
      description: 'IPv4 CIDR allowed to RDP to Windows Server instance (ex. 200.1.2.3/32)'  
    });

    // S3 Bucket used by some of the modernization tools

    const winModAssetBucket = new s3.Bucket(this, 'WinModAssetBucket', {
      versioned: true,
    });

    // Lab environment VPC

    const labVpc = new ec2.Vpc(this, 'LabVPC');

    // Security Group to be used with Windows Server EC2 instance, allowing connection from user's IP to RDP and anywhere to HTTP

    const winModServerSG = new ec2.SecurityGroup(this, 'WinModServerSG', {
      vpc: labVpc,
    });
    winModServerSG.addIngressRule(ec2.Peer.ipv4(winModServerAllowedCIDR.valueAsString), ec2.Port.tcp(3389), 'Allow RDP traffic');
    winModServerSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');

    // EC2 User Data used with Windows Server instance to install dependencies and features

    const winModServerUserdata = ec2.UserData.forWindows();
    winModServerUserdata.addCommands("Import-Module ServerManager;");
    winModServerUserdata.addCommands("Enable-WindowsOptionalFeature -Online -NoRestart -FeatureName 'IIS-ASPNET45' -All;");
    winModServerUserdata.addCommands("Enable-WindowsOptionalFeature -Online -NoRestart -FeatureName 'Containers' -All");
    winModServerUserdata.addCommands("Install-PackageProvider -Name NuGet -Force");
    winModServerUserdata.addCommands("Install-Module -Name DockerMsftProvider -Repository PSGallery -Force");
    winModServerUserdata.addCommands("Install-Package -Name docker -ProviderName DockerMsftProvider -Force");
    winModServerUserdata.addCommands("Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))");
    winModServerUserdata.addCommands("choco install -y git awscli firefox dotnetcore-3.1-sdk dotnet-6.0-sdk vscode visualstudio2022community visualstudio2022buildtools visualstudio2022-workload-netweb visualstudio2022-workload-webbuildtools sql-server-management-studio");
    winModServerUserdata.addCommands("Restart-Computer -Force");

    // EC2 instance running Windows Server 2019 to act as client/server for demonstrations

    const winModServer = new ec2.Instance(this, 'WinModServer', {
      instanceName: 'WinModServer',
      vpc: labVpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE),
      securityGroup: winModServerSG,
      blockDevices: [{
        deviceName: '/dev/sda1',
        volume: ec2.BlockDeviceVolume.ebs(120, {
          volumeType: ec2.EbsDeviceVolumeType.GP3
        }),
      }],
      userData: winModServerUserdata,
      userDataCausesReplacement: true,
      keyName: winModServerKey.valueAsString,
      
    });

    // Security Group to be used with RDS, allowing connection from Windows Server instance

    const winModDatabaseSG = new ec2.SecurityGroup(this, 'WinModDatabaseSG', {
      vpc: labVpc,
    });
    winModDatabaseSG.addIngressRule(ec2.Peer.securityGroupId(winModServerSG.securityGroupId), ec2.Port.tcp(1433))

    // MSSQL RDS instance to be used in demonstrations

    const winModDatabase = new rds.DatabaseInstance(this, 'WinModDatabase', {
      vpc: labVpc,
      engine: rds.DatabaseInstanceEngine.sqlServerSe({
        version: rds.SqlServerEngineVersion.VER_15,
      }),
      licenseModel: rds.LicenseModel.LICENSE_INCLUDED,
      securityGroups: [
        winModDatabaseSG
      ],
      credentials: {
        username: 'labuser',
        password: SecretValue.plainText('labpasswd')
      }
    });

    // CloudFormation stack outputs

    new CfnOutput(this, 'ServerAddress', {
      value: winModServer.instancePublicIp
    });

    new CfnOutput(this, 'DatabaseAddress', {
      value: winModDatabase.dbInstanceEndpointAddress
    });
    new CfnOutput(this, 'DatabasePort', {
      value: winModDatabase.dbInstanceEndpointPort
    });
    new CfnOutput(this, 'AssetBucketName', {
      value: winModAssetBucket.bucketName
    });

  }
}
