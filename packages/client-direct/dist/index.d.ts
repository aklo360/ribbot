import express from 'express';
import { AgentRuntime, Client } from '@elizaos/core';

declare const messageHandlerTemplate: string;
declare class DirectClient {
    app: express.Application;
    private agents;
    private server;
    startAgent: Function;
    constructor();
    registerAgent(runtime: AgentRuntime): void;
    unregisterAgent(runtime: AgentRuntime): void;
    start(port: number): void;
    stop(): void;
}
declare const DirectClientInterface: Client;

export { DirectClient, DirectClientInterface, DirectClientInterface as default, messageHandlerTemplate };
