FROM golang:1.24-alpine AS build
WORKDIR /src
# Set GOPROXY to use a more reliable proxy
ENV GOPROXY=https://goproxy.io,direct
# Set Go modules to work offline if needed
ENV GO111MODULE=on
COPY go.mod .
# Add timeout and retry options for go mod download
RUN go mod download -x || go mod download -x || true
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server
RUN CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate
RUN CGO_ENABLED=0 go build -o /out/seed ./cmd/seed

FROM alpine:3.19 AS runner
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=build /out/migrate /app/migrate
COPY --from=build /out/seed /app/seed
COPY --from=build /src/migrations /app/migrations
COPY --from=build /src/seeds /app/seeds
# Install curl for healthcheck
RUN apk add --no-cache curl
RUN adduser -D appuser
USER appuser
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -f http://localhost:3002/healthz || exit 1
CMD ["/app/server"]