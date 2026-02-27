package com.supertrace.aitrace.utils;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.UUID;

/**
 * Jwt authentication util component
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    @Value("${jwt.renewal-threshold}")
    private long renewalThreshold;

    /**
     * Generate jwt token
     *
     * @param uuid uuid
     * @return jwt token
     */
    public String generateToken(UUID uuid) {
        return Jwts.builder()
            .setSubject(uuid.toString())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)), SignatureAlgorithm.HS256)
            .compact();
    }

    /**
     * Authenticate a jwt token is valid given an uuid
     *
     * @param token jwt token
     * @param uuid given uuid
     * @return true if valid else false
     */
    public boolean isTokenValid(String token, UUID uuid) {
        return extractUuid(token).toString().equals(uuid.toString()) && !isExpired(token);
    }

    /**
     * Returns true when the token is valid but will expire within the renewal threshold,
     * meaning a fresh token should be issued to extend the session (sliding window).
     *
     * @param token jwt token
     * @return true if renewal is needed
     */
    public boolean needsRenewal(String token) {
        Date exp = extractExpiration(token);
        return (exp.getTime() - System.currentTimeMillis()) < renewalThreshold;
    }

    /**
     * Extract uuid from jwt token
     *
     * @param token jwt token
     * @return uuid
     */
    public UUID extractUuid(String token) {
        String userId = Jwts.parserBuilder()
            .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)))
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
        return UUID.fromString(userId);
    }

    private Date extractExpiration(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)))
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getExpiration();
    }

    private boolean isExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
