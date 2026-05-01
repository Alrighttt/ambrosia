FROM nginx:1.27-alpine

# Strip everything default nginx ships and replace with our static site.
RUN rm -rf /usr/share/nginx/html/*
COPY index.html app.js style.css /usr/share/nginx/html/
COPY lib /usr/share/nginx/html/lib
COPY setup /usr/share/nginx/html/setup
COPY vendor /usr/share/nginx/html/vendor

# WASM needs the right MIME type or some browsers reject the streaming compile.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
