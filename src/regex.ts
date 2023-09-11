export const conn_regex = /connection[= ]([a-z0-9-]+)/i;
export const ip_regex = /ip=([0-9.]+)/;
export const location_regex = /location=([A-Za-z0-9]+)/;
export const index_regex = /connIndex=(\d)/;

export const disconnect_regex = /Unregistered tunnel connection connIndex=(\d)/i;
export const tunnelID_regex = /tunnelID=([0-9a-z-]+)/i;
export const connectorID_regex = /Connector ID: ([0-9a-z-]+)/i;
export const metrics_regex = /metrics server on ([0-9.:]+\/metrics)/;
export const config_regex = /config="(.+[^\\])"/;
