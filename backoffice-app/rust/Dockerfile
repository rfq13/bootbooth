FROM rust:1.81-alpine AS build
WORKDIR /src
COPY Cargo.toml .
COPY src ./src
RUN cargo build --release

FROM alpine:3.19 AS runner
WORKDIR /app
RUN adduser -D appuser
USER appuser
COPY --from=build /src/target/release/libbackoffice_rust.* /app/
CMD ["/bin/sh"]