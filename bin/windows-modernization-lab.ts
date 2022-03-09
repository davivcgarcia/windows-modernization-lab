#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WindowsModernizationLabStack } from '../lib/windows-modernization-lab-stack';

const app = new cdk.App();
new WindowsModernizationLabStack(app, 'WindowsModernizationLabStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});