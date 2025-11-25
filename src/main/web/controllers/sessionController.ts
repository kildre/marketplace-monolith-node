import { Request, Response } from "express";
import log from "src/main/service/loggingService";

import RegisterSessionRequestDto from "../dtos/RegisterSessionRequestDto";
import RegisterSessionResponseDto from "../dtos/RegisterSessionResponseDto";

import GetSessionRequestDto from "../dtos/GetSessionRequestDto";
import GetSessionResponseDto from "../dtos/GetSessionResponseDto";

import ExpireSessionRequestDto from "../dtos/ExpireSessionRequestDto";
import ExpireSessionResponseDto from "../dtos/ExpireSessionResponseDto";

import { sessionTokenService } from "src/main/service/sessionTokenService";
import ConstraintError from "../../domain/errors/ConstraintError";
import { SessionToken } from "../../rdbms/entities/SessionToken";

import { getAuthToken, getCache } from "../../config/authConfig";
import { get } from "http";

// ====================================================================
// 1) POST /api/session/register
// ====================================================================

export async function registerSessionController(req: Request, res: Response) {
    try {
        console.log("Register session request body:", req.body);
        const requestDto = new RegisterSessionRequestDto(req.body);

        const { sessionId, refreshToken } = requestDto;
        console.log("Registering session:", sessionId);

        // Check if sessionId already exists
        const existing = await sessionTokenService.getAnyBySessionId?.(sessionId);
        if (existing) {
            log.warn(`Attempt to register already existing sessionId: ${sessionId}`);
            // Return 401 Conflict when session already exists
            const responseDto = new RegisterSessionResponseDto({
                sessionId,
                stored: false,
            });
            return res.status(401).json({ error: "Session already exists", ...responseDto });
        }

        // Extract access token from Authorization header (getAuthToken is now async)
        const accessToken = await getAuthToken(req);
        console.log("Access token extracted:", accessToken);
        // If no access token was provided, respond with 401
        if (!accessToken) {
          return res.status(401).json({ error: "Missing access token" });
        }

        // Step 1: validate / introspect Keycloak token
        const introspectionResult = getCache(accessToken);

        // Ensure we have a valid introspection result with an exp claim
        if (!introspectionResult || typeof introspectionResult.exp !== "number") {
            return res.status(401).json({ error: "Invalid or expired access token" });
        }

        const tokenExpDate = new Date(introspectionResult.exp * 1000);
        console.log("Token claims:", introspectionResult);
        // Step 2: persist via service
        const entity = await sessionTokenService.storeTokenForSession(sessionId, {
            accessToken,
            refreshToken: refreshToken ?? null,
            keycloakUserId: introspectionResult.sub || null,
            username: introspectionResult.sub || null,
            realmRoles: introspectionResult.realm_access?.roles ?? [],
            resourceRoles: introspectionResult.resource_access ?? {},
            tokenExp: tokenExpDate,
        });
        console.log("Stored session token entity:", entity);
        // Step 3: build response DTO
        const responseDto = new RegisterSessionResponseDto({
            sessionId: entity.sessionId,
            stored: true,
        });

        return res.status(201).json(responseDto);
    } catch (err: any) {
        if (err instanceof ConstraintError) {
            return res.status(400).json({ error: "Invalid request body", details: (err as any).errors ?? err.message });
        }

        // Log the full error with stack and any SQL details
        log.error(`Error in registerSessionController: ${err?.stack ?? err?.message ?? String(err)}`);

        // Log Sequelize-specific error details if available
        if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeDatabaseError') {
            log.error(`Sequelize Error Details: ${JSON.stringify({
                name: err.name,
                message: err.message,
                sql: err.sql,
                parameters: err.parameters,
                original: err.original
            })}`);
        }

        // if your introspection throws a specific error for invalid token, you could map to 401
        return res.status(500).json({ error: "Failed to register session" });
    }
}

// ====================================================================
// 2) GET /api/session/:sessionId   (session status)
// ====================================================================

export async function getSessionStatusController(req: Request, res: Response) {
  try {
    console.log("Get session status for sessionId:", req.params.sessionId ?? req.query.sessionId);
    const requestDto = new GetSessionRequestDto({
      sessionId: req.params.sessionId ?? req.query.sessionId?.toString() ?? "",
    });

    const entity = await sessionTokenService.getAnyBySessionId?.(
      requestDto.sessionId
    );
    console.log("Retrieved session token entity:", entity);
    // If you don't have getActiveOrAnyBySessionId, you can decide:
    // - if you want only ACTIVE: use getActiveTokenBySessionId
    // - if you want to show expired/revoked: use DAO directly or add a new service method

    if (!entity) {
      // Session not found
      const responseDto = new GetSessionResponseDto({
          sessionId: requestDto.sessionId,
          token: "",
          refreshToken: "",
      });
      console.log("No active session token found for sessionId:", responseDto);
      return res.status(404).json(responseDto);
    }
    console.log("Active session token found:", entity);
    const responseDto = new GetSessionResponseDto({
          sessionId: requestDto.sessionId,
          token: entity.accessToken,
          refreshToken: entity.refreshToken ?? "",
    });
    console.log("Response DTO for getSessionStatusController:", responseDto);
    return res.status(200).json(responseDto);
  } catch (err: any) {
    console.log("Error in getSessionStatusController:", err);
    if (err instanceof ConstraintError) {
      return res.status(400).json({ error: "Invalid request", details: (err as any).errors ?? err.message });
    }

    log.error(`Error in getSessionStatusController: ${err?.stack ?? err?.message ?? String(err)}`);
    return res.status(500).json({ error: "Failed to get session status" });
  }
}

// ====================================================================
// 3) POST /api/session/expire
// ====================================================================

export async function expireSessionController(req: Request, res: Response) {
  console.log("Expire session request body:", req.body);
  
  // Ensure we always send a response and don't fall through
  try {
    const requestDto = new ExpireSessionRequestDto(req.body);

    const { sessionId } = requestDto;

    const success = await sessionTokenService.deleteSessionBySessionId(sessionId);

    if (!success) {
      const responseDto = new ExpireSessionResponseDto({
        success: false,
        message: "Session not found",
      });
      return res.status(404).json(responseDto);
    }

    // Optionally re-fetch to show updated status
    const entity = await sessionTokenService.getAnyBySessionId?.(sessionId);

    const responseDto = new ExpireSessionResponseDto({
      success: true,
      message: "Session expired",
    });

    return res.status(200).json(responseDto);
  } catch (err: any) {
    if (err instanceof ConstraintError) {
      log.warn(`[VALIDATION] Invalid expire session request: ${err.message}`);
      return res.status(400).json({ error: "Invalid request body", details: (err as any).errors ?? err.message });
    }

    log.error(`Error in expireSessionController: ${err?.stack ?? err?.message ?? String(err)}`);
    return res.status(500).json({
      success: false,
      message: "Failed to expire session",
      error: err?.message,
    });
  }
}
