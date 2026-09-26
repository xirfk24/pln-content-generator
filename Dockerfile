# Build stage: compile the Go backend.
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Run stage: minimal runtime image.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /app/server .
ENV PORT=8080
EXPOSE 8080
CMD ["./server"]
