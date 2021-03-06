import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as utils from "../utils/utils";


const stackConfig = new pulumi.Config();
const infraReference = new pulumi.StackReference("aws-infra"); 

export interface ingressConfiguration {
    enable: boolean;
    k8sNamespace: string;
    version: string;
}

export interface certManagerConfiguration{

    enable: boolean;
    useSelfSignedCert: boolean;
    tlsCrt?: string;
    tlsKey?: string;
    cloudDnsSa: string;
    version: string;
}

export interface prometheusConfiguration {
    enable: boolean;
    k8sNamespace: string;
    version: string;
}

export interface clusterConfiguration {
    k8sVersion: string;
    k8sDashboard: boolean;
}

export interface nodeGroupConfiguration {
    enable: boolean;
    ami: string;
    namespace: string;
    diskSizeGb: number;
    instanceType: aws.ec2.InstanceType;
    maxNodes: number;
    minNodes: number;
    nodeCount: number;
    config: pulumi.Config;
    k8sVersion: string;
    publickey: string;
}

export interface infrastructureConfig {
    vpcid: pulumi.Output<any>;
    vpcCIDR: pulumi.Output<any>;
    vpcIsolatedSubnetIds: pulumi.Output<any>;
    vpcPrivateSubnetIds: pulumi.Output<any>;
    vpcPublicSubnetIds: pulumi.Output<any>;
    vpcAllSubnets: pulumi.Output<any>;
    bastionEnable: pulumi.Output<any>;
    bastionSgId: pulumi.Output<any>;
    clusterAdminRole: aws.iam.Role;
    loadBalancerTargetGroups: pulumi.Output<any>[];
}

function getIngressConfig(namespace : string): ingressConfiguration {
    let ingressConfig = new pulumi.Config(namespace);
    let val: ingressConfiguration = {
            enable: ingressConfig.requireBoolean("enable"),
            version: ingressConfig.require("version"),
            k8sNamespace: ingressConfig.require("k8sNamespace"),
    };
    return val;
}
export const ingressConfig = getIngressConfig("nginxingress");


function getCertManagerConfig(namespace : string): certManagerConfiguration{
    let cmConfig = new pulumi.Config(namespace);
    let val: certManagerConfiguration = {
        enable: cmConfig.requireBoolean("enable"),
        useSelfSignedCert: cmConfig.requireBoolean("useselfsignedcert"),
        version: cmConfig.require("version"),
        tlsKey: cmConfig.get("tls-key") || "",
        tlsCrt: cmConfig.get("tls-crt") || "",
        cloudDnsSa: cmConfig.get("clouddns") || "",
    }
    return val;
}
export const cmConfig = getCertManagerConfig("certmanager");

function getPrometheusConfig(namespace: string): prometheusConfiguration {
    let promconfig = new pulumi.Config(namespace);
    let val: prometheusConfiguration = {
        enable: promconfig.requireBoolean("enable"),
        version: promconfig.require("version"),
        k8sNamespace: promconfig.require("k8sNamespace")
    } 
    return val;
}
export const prometheusConfig = getPrometheusConfig("prometheus");

function getNodeGroupConfig(namespace : string): nodeGroupConfiguration{
    let tempconfig = new pulumi.Config(namespace);
    let val: nodeGroupConfiguration = {
        enable: tempconfig.getBoolean("enable") == undefined ? true : tempconfig.requireBoolean("enable"),
        ami: tempconfig.require("ami"),
        namespace: namespace,
        diskSizeGb: tempconfig.requireNumber("diskSizeGb"),
        instanceType: tempconfig.require<aws.ec2.InstanceType>("instanceType"),
        maxNodes: tempconfig.requireNumber("maxNodes"),
        minNodes: tempconfig.requireNumber("minNodes"),
        nodeCount: tempconfig.requireNumber("nodeCount"),
        k8sVersion: stackConfig.require("k8sVersion"),
        publickey: stackConfig.require("pubKey"),
        config: tempconfig,
    };
    return val;
};
export const primaryNodeGroupConfig = getNodeGroupConfig("primarynodes");
export const frontendNodeGroupConfig = getNodeGroupConfig("frontendnodes");
export const dsNodeGroupConfig = getNodeGroupConfig("dsnodes");

export const clusterConfig : clusterConfiguration =  {
    k8sVersion: stackConfig.require("k8sVersion"),
    k8sDashboard : stackConfig.getBoolean("k8sDashboard") || false,
}

export const infra: infrastructureConfig = {
    vpcid: infraReference.requireOutput("vpcid"),
    vpcCIDR: infraReference.requireOutput("vpcCIDR"),
    vpcIsolatedSubnetIds: infraReference.requireOutput("vpcIsolatedSubnetsIds"),
    vpcPrivateSubnetIds: infraReference.requireOutput("vpcPrivateSubnetsIds"),
    vpcPublicSubnetIds: infraReference.requireOutput("vpcPublicSubnetsIds"),
    vpcAllSubnets: infraReference.requireOutput("vpcAllSubnets"),
    bastionEnable: infraReference.requireOutput("bastionEnable"),
    bastionSgId: infraReference.requireOutput("bastionSgId"),
    clusterAdminRole: aws.iam.Role.get("clusterAdministratorRole", infraReference.requireOutput("clusterAdministratorRoleID")),
    loadBalancerTargetGroups: [infraReference.requireOutput("extIngresstg80arn"), infraReference.requireOutput("extIngresstg443arn")],
};