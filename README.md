This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

===============================

API USAGE
PS C:\Users\mikes\Alleyroads - Skypoint\SOFTWARE-BUILT-SKYPOINT\nextjs-post-auto> Invoke-WebRequest -Uri "http://localhost:3000/api/process-scheduled-posts" -Method GET


StatusCode        : 200
StatusDescription : OK
Content           : {"message":"No pending posts to process"}
RawContent        : HTTP/1.1 200 OK
                    vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
                    Connection: keep-alive
                    Keep-Alive: timeout=5
                    Transfer-Encoding: chunked
                    Content-Type: applica...
Forms             : {}
Headers           : {[vary, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch],
                    [Connection, keep-alive], [Keep-Alive, timeout=5], [Transfer-Encoding, chunked]...}
Images            : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 41



PS C:\Users\mikes\Alleyroads - Skypoint\SOFTWARE-BUILT-SKYPOINT\nextjs-post-auto>


====
echo "# SKYPOINT_SOCIAL" >> README.md
git init
git add *
git commit -m "first commit"
git remote add origin git@github.com:Skyfz/SKYPOINT_SOCIAL.git
git branch -M main
git push -u origin main