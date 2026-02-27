package com.supertrace.aitrace.filter;

import com.supertrace.aitrace.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.naming.AuthenticationException;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    /**
     * Dont need jwt route
     */
    private static final List<String> WHITE_LIST = List.of(
        "/api/auth/github/callback",
        "/api/register",
        "/api/v0/log"
    );


    @Autowired
    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String token = request.getHeader("AT-token");
        if (isWhiteList(path)) {
            filterChain.doFilter(request, response);
            return ;
        }
        if (token == null || token.isBlank()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\": \"Token is required\"}");
            return;
        }

        UUID userId;
        try {
            userId = this.jwtUtil.extractUuid(token);
            boolean valid = this.jwtUtil.isTokenValid(token, userId);
            if (!valid) {
                throw new AuthenticationException("Invalid token");
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\": \"Invalid JWT\"}");
            return ;
        }
        request.setAttribute("userId", userId);
        if (this.jwtUtil.needsRenewal(token)) {
            response.setHeader("AT-token-refresh", this.jwtUtil.generateToken(userId));
        }
        filterChain.doFilter(request, response);
    }

    private boolean isWhiteList(String path) {
        return WHITE_LIST.stream().anyMatch(path::startsWith);
    }
}
