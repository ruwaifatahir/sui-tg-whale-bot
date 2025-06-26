================================================
FILE: README.md
================================================

# 🤖 Sui Telegram Ads Bot

A powerful Telegram bot built with Sui blockchain integration for managing advertisements and user interactions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PNPM package manager
- Supabase account

### Installation

```bash
# Clone and install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

## 🗄️ Database Configuration

### Supabase Setup

1. **Create Project**: Navigate to your [Supabase Dashboard](https://supabase.com/dashboard)
2. **Get Connection URLs**:
   - Go to **Project Settings** → **Database**
   - Copy the **Session pooler** URL as both `DATABASE_URL` and `DIRECT_URL`

### Environment Variables

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[database]"
DIRECT_URL="postgresql://[user]:[password]@[host]:5432/[database]"
```

> **Note**: Replace `[YOUR-PASSWORD]` with your actual database password from Supabase settings.

### Database Migration

```bash
# Initialize Prisma (if needed)
pnpm prisma init

# Run migrations
pnpm db:migrate [migration-name]

# Generate Prisma client (after schema changes)
pnpm db:generate
```

## 🏃‍♂️ Running the Application

```bash
pnpm start
```

## 🔧 Troubleshooting

| Issue                        | Solution                                                |
| ---------------------------- | ------------------------------------------------------- |
| **Connection Error (P1001)** | Disable VPN and retry                                   |
| **Schema Error (P4002)**     | Create a fresh Supabase project                         |
| **Migration Issues**         | Ensure DATABASE_URL and DIRECT_URL are correctly set    |
| **Prepared Statement Error** | Use Session pooler for both DATABASE_URL and DIRECT_URL |

## 📚 Resources

- [Supabase Database Setup Video](https://www.youtube.com/watch?v=jA2-IwR0zjk)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Sui Documentation](https://docs.sui.io)

---

<div align="center">
  <sub>Built with ❤️ using TypeScript, Prisma, and Supabase</sub>
</div>

================================================
FILE: Dockerfile
================================================
FROM node:18-slim

# Install necessary packages for Prisma

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/\*

WORKDIR /usr/src/app

# Copy package files and prisma schema

COPY package.json ./
COPY prisma ./prisma

# Install all dependencies (including dev dependencies needed for build)

RUN npm install

# Copy source code and configuration files

COPY . .

# Build TypeScript

RUN npm run build

# Remove dev dependencies to reduce image size

RUN npm prune --omit=dev

# Expose port (optional, for health checks)

EXPOSE 3000

# Start the bot

CMD ["npm", "start"]

================================================
FILE: index.ts
================================================
import "dotenv/config";

import { Telegraf, Scenes, session } from "telegraf";
import { HttpsProxyAgent } from "https-proxy-agent";

import { WizardState } from "./src/lib/types";
import { welcomeStep } from "./src/steps/welcome-step";
import { tokenStep } from "./src/steps/token-step";
import { urlStep } from "./src/steps/url-step";
import { packageStep } from "./src/steps/package-step";
import { paymentStep } from "./src/steps/payment-step";
import { finalStep } from "./src/steps/final-step";
import { startCommand } from "./src/commands/start";
import { cancelCommand } from "./src/commands/cancel";
import { ordersCommand } from "./src/commands/orders";
import { activeCommand } from "./src/commands/active";
import { historyCommand } from "./src/commands/history";
import { helpCommand } from "./src/commands/help";
import { infoCommand } from "./src/commands/info";
import { handleOrderCallbacks } from "./src/handlers/order-callbacks";
import { handleFieldEditMessage } from "./src/handlers/field-edit";

const agent =
process.env.NODE_ENV === "development" && process.env.HTTPS_PROXY
? new HttpsProxyAgent(process.env.HTTPS_PROXY)
: undefined;

const bot = new Telegraf<Scenes.WizardContext<WizardState>>(
process.env.BOT_TOKEN!,
{
telegram: { agent },
}
);

// Create the wizard scene
const orderWizard = new Scenes.WizardScene<Scenes.WizardContext<WizardState>>(
"order-wizard",
welcomeStep,
tokenStep,
urlStep,
packageStep,
paymentStep,
finalStep
);

// Restart the scene if started in the middle of the scene
orderWizard.command("start", startCommand);

orderWizard.command("cancel", cancelCommand);

const stage = new Scenes.Stage<Scenes.WizardContext<WizardState>>([
orderWizard,
]);

bot.use(session());
bot.use(stage.middleware());

//Global start command when not in any scene
bot.start(async (ctx) => {
return ctx.scene.enter("order-wizard");
});

// Order management commands
bot.command("orders", ordersCommand);
bot.command("active", activeCommand);
bot.command("history", historyCommand);

// Information commands
bot.command("help", helpCommand);
bot.command("info", infoCommand);

// Order callback handlers (outside of wizard scene)
bot.on("callback_query", handleOrderCallbacks);

// Field editing message handler (outside of wizard scene)
bot.on("text", handleFieldEditMessage);

const blockedCommands = ["orders", "active", "history", "help", "info"];

blockedCommands.forEach((command) => {
orderWizard.command(command, async (ctx) => {
await ctx.reply(
`⚠️ /${command} is not available during order process. Use /cancel to cancel your current order first.`,
{ parse_mode: "HTML" }
);
});
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

================================================
FILE: nodemon.json
================================================
{
"watch": ["src"],
"ext": "ts",
"exec": "ts-node ./index.ts"
}

================================================
FILE: package.json
================================================
{
"name": "sui-tg-ads-bot",
"version": "1.0.0",
"description": "",
"main": "index.js",
"scripts": {
"dev": "nodemon",
"build": "tsc",
"start": "node dist/index.js",
"db:migrate": "prisma migrate dev --name",
"db:generate": "prisma generate",
"postinstall": "prisma generate"
},
"keywords": [],
"author": "",
"license": "ISC",
"packageManager": "pnpm@10.11.0",
"dependencies": {
"@mysten/sui": "^1.34.0",
"@prisma/client": "6.10.1",
"dotenv": "^16.5.0",
"https-proxy-agent": "^7.0.6",
"nodemon": "^3.1.10",
"prisma": "^6.10.1",
"telegraf": "^4.16.3"
},
"devDependencies": {
"@types/node": "^24.0.4",
"ts-node": "^10.9.2",
"typescript": "^5.8.3"
}
}

================================================
FILE: pnpm-lock.yaml
================================================
lockfileVersion: '9.0'

settings:
autoInstallPeers: true
excludeLinksFromLockfile: false

importers:

.:
dependencies:
'@mysten/sui':
specifier: ^1.34.0
version: 1.34.0(typescript@5.8.3)
'@prisma/client':
specifier: 6.10.1
version: 6.10.1(prisma@6.10.1(typescript@5.8.3))(typescript@5.8.3)
dotenv:
specifier: ^16.5.0
version: 16.5.0
https-proxy-agent:
specifier: ^7.0.6
version: 7.0.6
nodemon:
specifier: ^3.1.10
version: 3.1.10
prisma:
specifier: ^6.10.1
version: 6.10.1(typescript@5.8.3)
telegraf:
specifier: ^4.16.3
version: 4.16.3
devDependencies:
'@types/node':
specifier: ^24.0.4
version: 24.0.4
ts-node:
specifier: ^10.9.2
version: 10.9.2(@types/node@24.0.4)(typescript@5.8.3)
typescript:
specifier: ^5.8.3
version: 5.8.3

packages:

'@0no-co/graphql.web@1.1.2':
resolution: {integrity: sha512-N2NGsU5FLBhT8NZ+3l2YrzZSHITjNXNuDhC4iDiikv0IujaJ0Xc6xIxQZ/Ek3Cb+rgPjnLHYyJm11tInuJn+cw==}
peerDependencies:
graphql: ^14.0.0 || ^15.0.0 || ^16.0.0
peerDependenciesMeta:
graphql:
optional: true

'@0no-co/graphqlsp@1.12.16':
resolution: {integrity: sha512-B5pyYVH93Etv7xjT6IfB7QtMBdaaC07yjbhN6v8H7KgFStMkPvi+oWYBTibMFRMY89qwc9H8YixXg8SXDVgYWw==}
peerDependencies:
graphql: ^15.5.0 || ^16.0.0 || ^17.0.0
typescript: ^5.0.0

'@cspotcode/source-map-support@0.8.1':
resolution: {integrity: sha512-IchNf6dN4tHoMFIn/7OE8LWZ19Y6q/67Bmf6vnGREv8RSbBVb9LPJxEcnwrcwX6ixSvaiGoomAUvu4YSxXrVgw==}
engines: {node: '>=12'}

'@gql.tada/cli-utils@1.6.3':
resolution: {integrity: sha512-jFFSY8OxYeBxdKi58UzeMXG1tdm4FVjXa8WHIi66Gzu9JWtCE6mqom3a8xkmSw+mVaybFW5EN2WXf1WztJVNyQ==}
peerDependencies:
'@0no-co/graphqlsp': ^1.12.13
'@gql.tada/svelte-support': 1.0.1
'@gql.tada/vue-support': 1.0.1
graphql: ^15.5.0 || ^16.0.0 || ^17.0.0
typescript: ^5.0.0
peerDependenciesMeta:
'@gql.tada/svelte-support':
optional: true
'@gql.tada/vue-support':
optional: true

'@gql.tada/internal@1.0.8':
resolution: {integrity: sha512-XYdxJhtHC5WtZfdDqtKjcQ4d7R1s0d1rnlSs3OcBEUbYiPoJJfZU7tWsVXuv047Z6msvmr4ompJ7eLSK5Km57g==}
peerDependencies:
graphql: ^15.5.0 || ^16.0.0 || ^17.0.0
typescript: ^5.0.0

'@graphql-typed-document-node/core@3.2.0':
resolution: {integrity: sha512-mB9oAsNCm9aM3/SOv4YtBMqZbYj10R7dkq8byBqxGY/ncFwhf2oQzMV+LCRlWoDSEBJ3COiR1yeDvMtsoOsuFQ==}
peerDependencies:
graphql: ^0.8.0 || ^0.9.0 || ^0.10.0 || ^0.11.0 || ^0.12.0 || ^0.13.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0

'@jridgewell/resolve-uri@3.1.2':
resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
engines: {node: '>=6.0.0'}

'@jridgewell/sourcemap-codec@1.5.0':
resolution: {integrity: sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==}

'@jridgewell/trace-mapping@0.3.9':
resolution: {integrity: sha512-3Belt6tdc8bPgAtbcmdtNJlirVoTmEb5e2gC94PnkwEW9jI6CAHUeoG85tjWP5WquqfavoMtMwiG4P926ZKKuQ==}

'@mysten/bcs@1.6.3':
resolution: {integrity: sha512-QQ6u0U7a4+/o6rZ9tALTeGYMdf6V5z/HkRI/mhD5/fSr80DJoGzOWpFszcN/fhJpKb36vBaSQUMpS7yNQ10xBQ==}

'@mysten/sui@1.34.0':
resolution: {integrity: sha512-Btf2Tq5VPXqABOXqtw9hV13DskepggP7MpeGb7OnRNF2grh1nHyWj9J0Y2UmkhZUEdTWpnVRnl/ufIZ6VmU1kg==}
engines: {node: '>=18'}

'@mysten/utils@0.1.0':
resolution: {integrity: sha512-nFxqArh4cr629elLsIk7UZmx5dFVshblwrfwaG7Dm2L/ii2C65bhK5tdTs6UiC3K0tCr8q8svrgzXyF9L0CN/A==}

'@noble/curves@1.9.2':
resolution: {integrity: sha512-HxngEd2XUcg9xi20JkwlLCtYwfoFw4JGkuZpT+WlsPD4gB/cxkvTD8fSsoAnphGZhFdZYKeQIPCuFlWPm1uE0g==}
engines: {node: ^14.21.3 || >=16}

'@noble/hashes@1.8.0':
resolution: {integrity: sha512-jCs9ldd7NwzpgXDIf6P3+NrHh9/sD6CQdxHyjQI+h/6rDNo88ypBxxz45UDuZHz9r3tNz7N/VInSVoVdtXEI4A==}
engines: {node: ^14.21.3 || >=16}

'@prisma/client@6.10.1':
resolution: {integrity: sha512-Re4pMlcUsQsUTAYMK7EJ4Bw2kg3WfZAAlr8GjORJaK4VOP6LxRQUQ1TuLnxcF42XqGkWQ36q5CQF1yVadANQ6w==}
engines: {node: '>=18.18'}
peerDependencies:
prisma: '\*'
typescript: '>=5.1.0'
peerDependenciesMeta:
prisma:
optional: true
typescript:
optional: true

'@prisma/config@6.10.1':
resolution: {integrity: sha512-kz4/bnqrOrzWo8KzYguN0cden4CzLJJ+2VSpKtF8utHS3l1JS0Lhv6BLwpOX6X9yNreTbZQZwewb+/BMPDCIYQ==}

'@prisma/debug@6.10.1':
resolution: {integrity: sha512-k2YT53cWxv9OLjW4zSYTZ6Z7j0gPfCzcr2Mj99qsuvlxr8WAKSZ2NcSR0zLf/mP4oxnYG842IMj3utTgcd7CaA==}

'@prisma/engines-version@6.10.1-1.9b628578b3b7cae625e8c927178f15a170e74a9c':
resolution: {integrity: sha512-ZJFTsEqapiTYVzXya6TUKYDFnSWCNegfUiG5ik9fleQva5Sk3DNyyUi7X1+0ZxWFHwHDr6BZV5Vm+iwP+LlciA==}

'@prisma/engines@6.10.1':
resolution: {integrity: sha512-Q07P5rS2iPwk2IQr/rUQJ42tHjpPyFcbiH7PXZlV81Ryr9NYIgdxcUrwgVOWVm5T7ap02C0dNd1dpnNcSWig8A==}

'@prisma/fetch-engine@6.10.1':
resolution: {integrity: sha512-clmbG/Jgmrc/n6Y77QcBmAUlq9LrwI9Dbgy4pq5jeEARBpRCWJDJ7PWW1P8p0LfFU0i5fsyO7FqRzRB8mkdS4g==}

'@prisma/get-platform@6.10.1':
resolution: {integrity: sha512-4CY5ndKylcsce9Mv+VWp5obbR2/86SHOLVV053pwIkhVtT9C9A83yqiqI/5kJM9T1v1u1qco/bYjDKycmei9HA==}

'@scure/base@1.2.6':
resolution: {integrity: sha512-g/nm5FgUa//MCj1gV09zTJTaM6KBAHqLN907YVQqf7zC49+DcO4B1so4ZX07Ef10Twr6nuqYEH9GEggFXA4Fmg==}

'@scure/bip32@1.7.0':
resolution: {integrity: sha512-E4FFX/N3f4B80AKWp5dP6ow+flD1LQZo/w8UnLGYZO674jS6YnYeepycOOksv+vLPSpgN35wgKgy+ybfTb2SMw==}

'@scure/bip39@1.6.0':
resolution: {integrity: sha512-+lF0BbLiJNwVlev4eKelw1WWLaiKXw7sSl8T6FvBlWkdX+94aGJ4o8XjUdlyhTCjd8c+B3KT3JfS8P0bLRNU6A==}

'@telegraf/types@7.1.0':
resolution: {integrity: sha512-kGevOIbpMcIlCDeorKGpwZmdH7kHbqlk/Yj6dEpJMKEQw5lk0KVQY0OLXaCswy8GqlIVLd5625OB+rAntP9xVw==}

'@tsconfig/node10@1.0.11':
resolution: {integrity: sha512-DcRjDCujK/kCk/cUe8Xz8ZSpm8mS3mNNpta+jGCA6USEDfktlNvm1+IuZ9eTcDbNk41BHwpHHeW+N1lKCz4zOw==}

'@tsconfig/node12@1.0.11':
resolution: {integrity: sha512-cqefuRsh12pWyGsIoBKJA9luFu3mRxCA+ORZvA4ktLSzIuCUtWVxGIuXigEwO5/ywWFMZ2QEGKWvkZG1zDMTag==}

'@tsconfig/node14@1.0.3':
resolution: {integrity: sha512-ysT8mhdixWK6Hw3i1V2AeRqZ5WfXg1G43mqoYlM2nc6388Fq5jcXyr5mRsqViLx/GJYdoL0bfXD8nmF+Zn/Iow==}

'@tsconfig/node16@1.0.4':
resolution: {integrity: sha512-vxhUy4J8lyeyinH7Azl1pdd43GJhZH/tP2weN8TntQblOY+A0XbT8DJk1/oCPuOOyg/Ja757rG0CgHcWC8OfMA==}

'@types/node@24.0.4':
resolution: {integrity: sha512-ulyqAkrhnuNq9pB76DRBTkcS6YsmDALy6Ua63V8OhrOBgbcYt6IOdzpw5P1+dyRIyMerzLkeYWBeOXPpA9GMAA==}

abort-controller@3.0.0:
resolution: {integrity: sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==}
engines: {node: '>=6.5'}

acorn-walk@8.3.4:
resolution: {integrity: sha512-ueEepnujpqee2o5aIYnvHU6C0A42MNdsIDeqy5BydrkuC5R1ZuUFnm27EeFJGoEHJQgn3uleRvmTXaJgfXbt4g==}
engines: {node: '>=0.4.0'}

acorn@8.15.0:
resolution: {integrity: sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==}
engines: {node: '>=0.4.0'}
hasBin: true

agent-base@7.1.3:
resolution: {integrity: sha512-jRR5wdylq8CkOe6hei19GGZnxM6rBGwFl3Bg0YItGDimvjGtAvdZk4Pu6Cl4u4Igsws4a1fd1Vq3ezrhn4KmFw==}
engines: {node: '>= 14'}

anymatch@3.1.3:
resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
engines: {node: '>= 8'}

arg@4.1.3:
resolution: {integrity: sha512-58S9QDqG0Xx27YwPSt9fJxivjYl432YCwfDMfZ+71RAqUrZef7LrKQZ3LHLOwCS4FLNBplP533Zx895SeOCHvA==}

balanced-match@1.0.2:
resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

binary-extensions@2.3.0:
resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
engines: {node: '>=8'}

brace-expansion@1.1.12:
resolution: {integrity: sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==}

braces@3.0.3:
resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
engines: {node: '>=8'}

buffer-alloc-unsafe@1.1.0:
resolution: {integrity: sha512-TEM2iMIEQdJ2yjPJoSIsldnleVaAk1oW3DBVUykyOLsEsFmEc9kn+SFFPz+gl54KQNxlDnAwCXosOS9Okx2xAg==}

buffer-alloc@1.2.0:
resolution: {integrity: sha512-CFsHQgjtW1UChdXgbyJGtnm+O/uLQeZdtbDo8mfUgYXCHSM1wgrVxXm6bSyrUuErEb+4sYVGCzASBRot7zyrow==}

buffer-fill@1.0.0:
resolution: {integrity: sha512-T7zexNBwiiaCOGDg9xNX9PBmjrubblRkENuptryuI64URkXDFum9il/JGL8Lm8wYfAXpredVXXZz7eMHilimiQ==}

chokidar@3.6.0:
resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
engines: {node: '>= 8.10.0'}

concat-map@0.0.1:
resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}

create-require@1.1.1:
resolution: {integrity: sha512-dcKFX3jn0MpIaXjisoRvexIJVEKzaq7z2rZKxf+MSr9TkdmHmsU4m2lcLojrj/FHl8mk5VxMmYA+ftRkP/3oKQ==}

debug@4.4.1:
resolution: {integrity: sha512-KcKCqiftBJcZr++7ykoDIEwSa3XWowTfNPo92BYxjXiyYEVrUQh2aLyhxBCwww+heortUFxEJYcRzosstTEBYQ==}
engines: {node: '>=6.0'}
peerDependencies:
supports-color: '\*'
peerDependenciesMeta:
supports-color:
optional: true

diff@4.0.2:
resolution: {integrity: sha512-58lmxKSA4BNyLz+HHMUzlOEpg09FV+ev6ZMe3vJihgdxzgcwZ8VoEEPmALCZG9LmqfVoNMMKpttIYTVG6uDY7A==}
engines: {node: '>=0.3.1'}

dotenv@16.5.0:
resolution: {integrity: sha512-m/C+AwOAr9/W1UOIZUo232ejMNnJAJtYQjUbHoNTBNTJSvqzzDh7vnrei3o3r3m9blf6ZoDkvcw0VmozNRFJxg==}
engines: {node: '>=12'}

event-target-shim@5.0.1:
resolution: {integrity: sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==}
engines: {node: '>=6'}

fill-range@7.1.1:
resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
engines: {node: '>=8'}

fsevents@2.3.3:
resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
os: [darwin]

glob-parent@5.1.2:
resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
engines: {node: '>= 6'}

gql.tada@1.8.10:
resolution: {integrity: sha512-FrvSxgz838FYVPgZHGOSgbpOjhR+yq44rCzww3oOPJYi0OvBJjAgCiP6LEokZIYND2fUTXzQAyLgcvgw1yNP5A==}
hasBin: true
peerDependencies:
typescript: ^5.0.0

graphql@16.11.0:
resolution: {integrity: sha512-mS1lbMsxgQj6hge1XZ6p7GPhbrtFwUFYi3wRzXAC/FmYnyXMTvvI3td3rjmQ2u8ewXueaSvRPWaEcgVVOT9Jnw==}
engines: {node: ^12.22.0 || ^14.16.0 || ^16.0.0 || >=17.0.0}

has-flag@3.0.0:
resolution: {integrity: sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==}
engines: {node: '>=4'}

https-proxy-agent@7.0.6:
resolution: {integrity: sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==}
engines: {node: '>= 14'}

ignore-by-default@1.0.1:
resolution: {integrity: sha512-Ius2VYcGNk7T90CppJqcIkS5ooHUZyIQK+ClZfMfMNFEF9VSE73Fq+906u/CWu92x4gzZMWOwfFYckPObzdEbA==}

is-binary-path@2.1.0:
resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
engines: {node: '>=8'}

is-extglob@2.1.1:
resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
engines: {node: '>=0.10.0'}

is-glob@4.0.3:
resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
engines: {node: '>=0.10.0'}

is-number@7.0.0:
resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
engines: {node: '>=0.12.0'}

jiti@2.4.2:
resolution: {integrity: sha512-rg9zJN+G4n2nfJl5MW3BMygZX56zKPNVEYYqq7adpmMh4Jn2QNEwhvQlFy6jPVdcod7txZtKHWnyZiA3a0zP7A==}
hasBin: true

make-error@1.3.6:
resolution: {integrity: sha512-s8UhlNe7vPKomQhC1qFelMokr/Sc3AgNbso3n74mVPA5LTZwkB9NlXf4XPamLxJE8h0gh73rM94xvwRT2CVInw==}

minimatch@3.1.2:
resolution: {integrity: sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==}

mri@1.2.0:
resolution: {integrity: sha512-tzzskb3bG8LvYGFF/mDTpq3jpI6Q9wc3LEmBaghu+DdCssd1FakN7Bc0hVNmEyGq1bq3RgfkCb3cmQLpNPOroA==}
engines: {node: '>=4'}

ms@2.1.3:
resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

node-fetch@2.7.0:
resolution: {integrity: sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==}
engines: {node: 4.x || >=6.0.0}
peerDependencies:
encoding: ^0.1.0
peerDependenciesMeta:
encoding:
optional: true

nodemon@3.1.10:
resolution: {integrity: sha512-WDjw3pJ0/0jMFmyNDp3gvY2YizjLmmOUQo6DEBY+JgdvW/yQ9mEeSw6H5ythl5Ny2ytb7f9C2nIbjSxMNzbJXw==}
engines: {node: '>=10'}
hasBin: true

normalize-path@3.0.0:
resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
engines: {node: '>=0.10.0'}

p-timeout@4.1.0:
resolution: {integrity: sha512-+/wmHtzJuWii1sXn3HCuH/FTwGhrp4tmJTxSKJbfS+vkipci6osxXM5mY0jUiRzWKMTgUT8l7HFbeSwZAynqHw==}
engines: {node: '>=10'}

picomatch@2.3.1:
resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
engines: {node: '>=8.6'}

poseidon-lite@0.2.1:
resolution: {integrity: sha512-xIr+G6HeYfOhCuswdqcFpSX47SPhm0EpisWJ6h7fHlWwaVIvH3dLnejpatrtw6Xc6HaLrpq05y7VRfvDmDGIog==}

prisma@6.10.1:
resolution: {integrity: sha512-khhlC/G49E4+uyA3T3H5PRBut486HD2bDqE2+rvkU0pwk9IAqGFacLFUyIx9Uw+W2eCtf6XGwsp+/strUwMNPw==}
engines: {node: '>=18.18'}
hasBin: true
peerDependencies:
typescript: '>=5.1.0'
peerDependenciesMeta:
typescript:
optional: true

pstree.remy@1.1.8:
resolution: {integrity: sha512-77DZwxQmxKnu3aR542U+X8FypNzbfJ+C5XQDk3uWjWxn6151aIMGthWYRXTqT1E5oJvg+ljaa2OJi+VfvCOQ8w==}

readdirp@3.6.0:
resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
engines: {node: '>=8.10.0'}

safe-compare@1.1.4:
resolution: {integrity: sha512-b9wZ986HHCo/HbKrRpBJb2kqXMK9CEWIE1egeEvZsYn69ay3kdfl9nG3RyOcR+jInTDf7a86WQ1d4VJX7goSSQ==}

sandwich-stream@2.0.2:
resolution: {integrity: sha512-jLYV0DORrzY3xaz/S9ydJL6Iz7essZeAfnAavsJ+zsJGZ1MOnsS52yRjU3uF3pJa/lla7+wisp//fxOwOH8SKQ==}
engines: {node: '>= 0.10'}

semver@7.7.2:
resolution: {integrity: sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==}
engines: {node: '>=10'}
hasBin: true

simple-update-notifier@2.0.0:
resolution: {integrity: sha512-a2B9Y0KlNXl9u/vsW6sTIu9vGEpfKu2wRV6l1H3XEas/0gUIzGzBoP/IouTcUQbm9JWZLH3COxyn03TYlFax6w==}
engines: {node: '>=10'}

supports-color@5.5.0:
resolution: {integrity: sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==}
engines: {node: '>=4'}

telegraf@4.16.3:
resolution: {integrity: sha512-yjEu2NwkHlXu0OARWoNhJlIjX09dRktiMQFsM678BAH/PEPVwctzL67+tvXqLCRQQvm3SDtki2saGO9hLlz68w==}
engines: {node: ^12.20.0 || >=14.13.1}
hasBin: true

to-regex-range@5.0.1:
resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
engines: {node: '>=8.0'}

touch@3.1.1:
resolution: {integrity: sha512-r0eojU4bI8MnHr8c5bNo7lJDdI2qXlWWJk6a9EAFG7vbhTjElYhBVS3/miuE0uOuoLdb8Mc/rVfsmm6eo5o9GA==}
hasBin: true

tr46@0.0.3:
resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}

ts-node@10.9.2:
resolution: {integrity: sha512-f0FFpIdcHgn8zcPSbf1dRevwt047YMnaiJM3u2w2RewrB+fob/zePZcrOyQoLMMO7aBIddLcQIEK5dYjkLnGrQ==}
hasBin: true
peerDependencies:
'@swc/core': '>=1.2.50'
'@swc/wasm': '>=1.2.50'
'@types/node': '\*'
typescript: '>=2.7'
peerDependenciesMeta:
'@swc/core':
optional: true
'@swc/wasm':
optional: true

typescript@5.8.3:
resolution: {integrity: sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ==}
engines: {node: '>=14.17'}
hasBin: true

undefsafe@2.0.5:
resolution: {integrity: sha512-WxONCrssBM8TSPRqN5EmsjVrsv4A8X12J4ArBiiayv3DyyG3ZlIg6yysuuSYdZsVz3TKcTg2fd//Ujd4CHV1iA==}

undici-types@7.8.0:
resolution: {integrity: sha512-9UJ2xGDvQ43tYyVMpuHlsgApydB8ZKfVYTsLDhXkFL/6gfkp+U8xTGdh8pMJv1SpZna0zxG1DwsKZsreLbXBxw==}

v8-compile-cache-lib@3.0.1:
resolution: {integrity: sha512-wa7YjyUGfNZngI/vtK0UHAN+lgDCxBPCylVXGp0zu59Fz5aiGtNXaq3DhIov063MorB+VfufLh3JlF2KdTK3xg==}

valibot@0.36.0:
resolution: {integrity: sha512-CjF1XN4sUce8sBK9TixrDqFM7RwNkuXdJu174/AwmQUB62QbCQADg5lLe8ldBalFgtj1uKj+pKwDJiNo4Mn+eQ==}

webidl-conversions@3.0.1:
resolution: {integrity: sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==}

whatwg-url@5.0.0:
resolution: {integrity: sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==}

yn@3.1.1:
resolution: {integrity: sha512-Ux4ygGWsu2c7isFWe8Yu1YluJmqVhxqK2cLXNQA5AcC3QfbGNpM7fu0Y8b/z16pXLnFxZYvWhd3fhBY9DLmC6Q==}
engines: {node: '>=6'}

snapshots:

'@0no-co/graphql.web@1.1.2(graphql@16.11.0)':
optionalDependencies:
graphql: 16.11.0

'@0no-co/graphqlsp@1.12.16(graphql@16.11.0)(typescript@5.8.3)':
dependencies:
'@gql.tada/internal': 1.0.8(graphql@16.11.0)(typescript@5.8.3)
graphql: 16.11.0
typescript: 5.8.3

'@cspotcode/source-map-support@0.8.1':
dependencies:
'@jridgewell/trace-mapping': 0.3.9

'@gql.tada/cli-utils@1.6.3(@0no-co/graphqlsp@1.12.16(graphql@16.11.0)(typescript@5.8.3))(graphql@16.11.0)(typescript@5.8.3)':
dependencies:
'@0no-co/graphqlsp': 1.12.16(graphql@16.11.0)(typescript@5.8.3)
'@gql.tada/internal': 1.0.8(graphql@16.11.0)(typescript@5.8.3)
graphql: 16.11.0
typescript: 5.8.3

'@gql.tada/internal@1.0.8(graphql@16.11.0)(typescript@5.8.3)':
dependencies:
'@0no-co/graphql.web': 1.1.2(graphql@16.11.0)
graphql: 16.11.0
typescript: 5.8.3

'@graphql-typed-document-node/core@3.2.0(graphql@16.11.0)':
dependencies:
graphql: 16.11.0

'@jridgewell/resolve-uri@3.1.2': {}

'@jridgewell/sourcemap-codec@1.5.0': {}

'@jridgewell/trace-mapping@0.3.9':
dependencies:
'@jridgewell/resolve-uri': 3.1.2
'@jridgewell/sourcemap-codec': 1.5.0

'@mysten/bcs@1.6.3':
dependencies:
'@mysten/utils': 0.1.0
'@scure/base': 1.2.6

'@mysten/sui@1.34.0(typescript@5.8.3)':
dependencies:
'@graphql-typed-document-node/core': 3.2.0(graphql@16.11.0)
'@mysten/bcs': 1.6.3
'@mysten/utils': 0.1.0
'@noble/curves': 1.9.2
'@noble/hashes': 1.8.0
'@scure/base': 1.2.6
'@scure/bip32': 1.7.0
'@scure/bip39': 1.6.0
gql.tada: 1.8.10(graphql@16.11.0)(typescript@5.8.3)
graphql: 16.11.0
poseidon-lite: 0.2.1
valibot: 0.36.0
transitivePeerDependencies: - '@gql.tada/svelte-support' - '@gql.tada/vue-support' - typescript

'@mysten/utils@0.1.0':
dependencies:
'@scure/base': 1.2.6

'@noble/curves@1.9.2':
dependencies:
'@noble/hashes': 1.8.0

'@noble/hashes@1.8.0': {}

'@prisma/client@6.10.1(prisma@6.10.1(typescript@5.8.3))(typescript@5.8.3)':
optionalDependencies:
prisma: 6.10.1(typescript@5.8.3)
typescript: 5.8.3

'@prisma/config@6.10.1':
dependencies:
jiti: 2.4.2

'@prisma/debug@6.10.1': {}

'@prisma/engines-version@6.10.1-1.9b628578b3b7cae625e8c927178f15a170e74a9c': {}

'@prisma/engines@6.10.1':
dependencies:
'@prisma/debug': 6.10.1
'@prisma/engines-version': 6.10.1-1.9b628578b3b7cae625e8c927178f15a170e74a9c
'@prisma/fetch-engine': 6.10.1
'@prisma/get-platform': 6.10.1

'@prisma/fetch-engine@6.10.1':
dependencies:
'@prisma/debug': 6.10.1
'@prisma/engines-version': 6.10.1-1.9b628578b3b7cae625e8c927178f15a170e74a9c
'@prisma/get-platform': 6.10.1

'@prisma/get-platform@6.10.1':
dependencies:
'@prisma/debug': 6.10.1

'@scure/base@1.2.6': {}

'@scure/bip32@1.7.0':
dependencies:
'@noble/curves': 1.9.2
'@noble/hashes': 1.8.0
'@scure/base': 1.2.6

'@scure/bip39@1.6.0':
dependencies:
'@noble/hashes': 1.8.0
'@scure/base': 1.2.6

'@telegraf/types@7.1.0': {}

'@tsconfig/node10@1.0.11': {}

'@tsconfig/node12@1.0.11': {}

'@tsconfig/node14@1.0.3': {}

'@tsconfig/node16@1.0.4': {}

'@types/node@24.0.4':
dependencies:
undici-types: 7.8.0

abort-controller@3.0.0:
dependencies:
event-target-shim: 5.0.1

acorn-walk@8.3.4:
dependencies:
acorn: 8.15.0

acorn@8.15.0: {}

agent-base@7.1.3: {}

anymatch@3.1.3:
dependencies:
normalize-path: 3.0.0
picomatch: 2.3.1

arg@4.1.3: {}

balanced-match@1.0.2: {}

binary-extensions@2.3.0: {}

brace-expansion@1.1.12:
dependencies:
balanced-match: 1.0.2
concat-map: 0.0.1

braces@3.0.3:
dependencies:
fill-range: 7.1.1

buffer-alloc-unsafe@1.1.0: {}

buffer-alloc@1.2.0:
dependencies:
buffer-alloc-unsafe: 1.1.0
buffer-fill: 1.0.0

buffer-fill@1.0.0: {}

chokidar@3.6.0:
dependencies:
anymatch: 3.1.3
braces: 3.0.3
glob-parent: 5.1.2
is-binary-path: 2.1.0
is-glob: 4.0.3
normalize-path: 3.0.0
readdirp: 3.6.0
optionalDependencies:
fsevents: 2.3.3

concat-map@0.0.1: {}

create-require@1.1.1: {}

debug@4.4.1(supports-color@5.5.0):
dependencies:
ms: 2.1.3
optionalDependencies:
supports-color: 5.5.0

diff@4.0.2: {}

dotenv@16.5.0: {}

event-target-shim@5.0.1: {}

fill-range@7.1.1:
dependencies:
to-regex-range: 5.0.1

fsevents@2.3.3:
optional: true

glob-parent@5.1.2:
dependencies:
is-glob: 4.0.3

gql.tada@1.8.10(graphql@16.11.0)(typescript@5.8.3):
dependencies:
'@0no-co/graphql.web': 1.1.2(graphql@16.11.0)
'@0no-co/graphqlsp': 1.12.16(graphql@16.11.0)(typescript@5.8.3)
'@gql.tada/cli-utils': 1.6.3(@0no-co/graphqlsp@1.12.16(graphql@16.11.0)(typescript@5.8.3))(graphql@16.11.0)(typescript@5.8.3)
'@gql.tada/internal': 1.0.8(graphql@16.11.0)(typescript@5.8.3)
typescript: 5.8.3
transitivePeerDependencies: - '@gql.tada/svelte-support' - '@gql.tada/vue-support' - graphql

graphql@16.11.0: {}

has-flag@3.0.0: {}

https-proxy-agent@7.0.6:
dependencies:
agent-base: 7.1.3
debug: 4.4.1(supports-color@5.5.0)
transitivePeerDependencies: - supports-color

ignore-by-default@1.0.1: {}

is-binary-path@2.1.0:
dependencies:
binary-extensions: 2.3.0

is-extglob@2.1.1: {}

is-glob@4.0.3:
dependencies:
is-extglob: 2.1.1

is-number@7.0.0: {}

jiti@2.4.2: {}

make-error@1.3.6: {}

minimatch@3.1.2:
dependencies:
brace-expansion: 1.1.12

mri@1.2.0: {}

ms@2.1.3: {}

node-fetch@2.7.0:
dependencies:
whatwg-url: 5.0.0

nodemon@3.1.10:
dependencies:
chokidar: 3.6.0
debug: 4.4.1(supports-color@5.5.0)
ignore-by-default: 1.0.1
minimatch: 3.1.2
pstree.remy: 1.1.8
semver: 7.7.2
simple-update-notifier: 2.0.0
supports-color: 5.5.0
touch: 3.1.1
undefsafe: 2.0.5

normalize-path@3.0.0: {}

p-timeout@4.1.0: {}

picomatch@2.3.1: {}

poseidon-lite@0.2.1: {}

prisma@6.10.1(typescript@5.8.3):
dependencies:
'@prisma/config': 6.10.1
'@prisma/engines': 6.10.1
optionalDependencies:
typescript: 5.8.3

pstree.remy@1.1.8: {}

readdirp@3.6.0:
dependencies:
picomatch: 2.3.1

safe-compare@1.1.4:
dependencies:
buffer-alloc: 1.2.0

sandwich-stream@2.0.2: {}

semver@7.7.2: {}

simple-update-notifier@2.0.0:
dependencies:
semver: 7.7.2

supports-color@5.5.0:
dependencies:
has-flag: 3.0.0

telegraf@4.16.3:
dependencies:
'@telegraf/types': 7.1.0
abort-controller: 3.0.0
debug: 4.4.1(supports-color@5.5.0)
mri: 1.2.0
node-fetch: 2.7.0
p-timeout: 4.1.0
safe-compare: 1.1.4
sandwich-stream: 2.0.2
transitivePeerDependencies: - encoding - supports-color

to-regex-range@5.0.1:
dependencies:
is-number: 7.0.0

touch@3.1.1: {}

tr46@0.0.3: {}

ts-node@10.9.2(@types/node@24.0.4)(typescript@5.8.3):
dependencies:
'@cspotcode/source-map-support': 0.8.1
'@tsconfig/node10': 1.0.11
'@tsconfig/node12': 1.0.11
'@tsconfig/node14': 1.0.3
'@tsconfig/node16': 1.0.4
'@types/node': 24.0.4
acorn: 8.15.0
acorn-walk: 8.3.4
arg: 4.1.3
create-require: 1.1.1
diff: 4.0.2
make-error: 1.3.6
typescript: 5.8.3
v8-compile-cache-lib: 3.0.1
yn: 3.1.1

typescript@5.8.3: {}

undefsafe@2.0.5: {}

undici-types@7.8.0: {}

v8-compile-cache-lib@3.0.1: {}

valibot@0.36.0: {}

webidl-conversions@3.0.1: {}

whatwg-url@5.0.0:
dependencies:
tr46: 0.0.3
webidl-conversions: 3.0.1

yn@3.1.1: {}

================================================
FILE: PROMPTS.md
================================================

- Please review my entire project to get the grasp of my codebase.

- We are just discussing for now, don't change any file yet.

- Keep your changes simple, clear and easy to understand. Keep your changes minimal and to the point. Do not add the comments in the code. Do not run any command at all strictly.

- Make sure your changes doesn't break the existing project.

- Rescpect the project structure and coding practices.

- Perform a deep and thorough investigation to find the actual root cause of the issue. Do not assume prematurely — reason critically, evaluate alternatives, and justify why your conclusion is truly the solution. Continuously challenge and refine your reasoning until you have a well-supported answer

================================================
FILE: tsconfig.json
================================================
{
"include": ["**/*"],
"exclude": ["node_modules", "dist"],
"compilerOptions": {
/_ Visit https://aka.ms/tsconfig to read more about this file _/

    /* Projects */
    // "incremental": true,                              /* Save .tsbuildinfo files to allow for incremental compilation of projects. */
    // "composite": true,                                /* Enable constraints that allow a TypeScript project to be used with project references. */
    // "tsBuildInfoFile": "./.tsbuildinfo",              /* Specify the path to .tsbuildinfo incremental compilation file. */
    // "disableSourceOfProjectReferenceRedirect": true,  /* Disable preferring source files instead of declaration files when referencing composite projects. */
    // "disableSolutionSearching": true,                 /* Opt a project out of multi-project reference checking when editing. */
    // "disableReferencedProjectLoad": true,             /* Reduce the number of projects loaded automatically by TypeScript. */

    /* Language and Environment */
    "target": "ES2020" /* Set the JavaScript language version for emitted JavaScript and include compatible library declarations. */,
    // "lib": [],                                        /* Specify a set of bundled library declaration files that describe the target runtime environment. */
    // "jsx": "preserve",                                /* Specify what JSX code is generated. */
    // "libReplacement": true,                           /* Enable lib replacement. */
    // "experimentalDecorators": true,                   /* Enable experimental support for legacy experimental decorators. */
    // "emitDecoratorMetadata": true,                    /* Emit design-type metadata for decorated declarations in source files. */
    // "jsxFactory": "",                                 /* Specify the JSX factory function used when targeting React JSX emit, e.g. 'React.createElement' or 'h'. */
    // "jsxFragmentFactory": "",                         /* Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g. 'React.Fragment' or 'Fragment'. */
    // "jsxImportSource": "",                            /* Specify module specifier used to import the JSX factory functions when using 'jsx: react-jsx*'. */
    // "reactNamespace": "",                             /* Specify the object invoked for 'createElement'. This only applies when targeting 'react' JSX emit. */
    // "noLib": true,                                    /* Disable including any library files, including the default lib.d.ts. */
    // "useDefineForClassFields": true,                  /* Emit ECMAScript-standard-compliant class fields. */
    // "moduleDetection": "auto",                        /* Control what method is used to detect module-format JS files. */

    /* Modules */
    "module": "CommonJS" /* Specify what module code is generated. */,
    // "rootDir": "./",                                  /* Specify the root folder within your source files. */
    "moduleResolution": "node" /* Specify how TypeScript looks up a file from a given module specifier. */,
    // "baseUrl": "./",                                  /* Specify the base directory to resolve non-relative module names. */
    // "paths": {},                                      /* Specify a set of entries that re-map imports to additional lookup locations. */
    // "rootDirs": [],                                   /* Allow multiple folders to be treated as one when resolving modules. */
    // "typeRoots": [],                                  /* Specify multiple folders that act like './node_modules/@types'. */
    // "types": [],                                      /* Specify type package names to be included without being referenced in a source file. */
    // "allowUmdGlobalAccess": true,                     /* Allow accessing UMD globals from modules. */
    // "moduleSuffixes": [],                             /* List of file name suffixes to search when resolving a module. */
    // "allowImportingTsExtensions": true,               /* Allow imports to include TypeScript file extensions. Requires '--moduleResolution bundler' and either '--noEmit' or '--emitDeclarationOnly' to be set. */
    // "rewriteRelativeImportExtensions": true,          /* Rewrite '.ts', '.tsx', '.mts', and '.cts' file extensions in relative import paths to their JavaScript equivalent in output files. */
    // "resolvePackageJsonExports": true,                /* Use the package.json 'exports' field when resolving package imports. */
    // "resolvePackageJsonImports": true,                /* Use the package.json 'imports' field when resolving imports. */
    // "customConditions": [],                           /* Conditions to set in addition to the resolver-specific defaults when resolving imports. */
    // "noUncheckedSideEffectImports": true,             /* Check side effect imports. */
    // "resolveJsonModule": true,                        /* Enable importing .json files. */
    // "allowArbitraryExtensions": true,                 /* Enable importing files with any extension, provided a declaration file is present. */
    // "noResolve": true,                                /* Disallow 'import's, 'require's or '<reference>'s from expanding the number of files TypeScript should add to a project. */

    /* JavaScript Support */
    "allowJs": true /* Allow JavaScript files to be a part of your program. Use the 'checkJS' option to get errors from these files. */,
    // "checkJs": true,                                  /* Enable error reporting in type-checked JavaScript files. */
    // "maxNodeModuleJsDepth": 1,                        /* Specify the maximum folder depth used for checking JavaScript files from 'node_modules'. Only applicable with 'allowJs'. */

    /* Emit */
    // "declaration": true,                              /* Generate .d.ts files from TypeScript and JavaScript files in your project. */
    // "declarationMap": true,                           /* Create sourcemaps for d.ts files. */
    // "emitDeclarationOnly": true,                      /* Only output d.ts files and not JavaScript files. */
    // "sourceMap": true,                                /* Create source map files for emitted JavaScript files. */
    // "inlineSourceMap": true,                          /* Include sourcemap files inside the emitted JavaScript. */
    // "noEmit": true,                                   /* Disable emitting files from a compilation. */
    // "outFile": "./",                                  /* Specify a file that bundles all outputs into one JavaScript file. If 'declaration' is true, also designates a file that bundles all .d.ts output. */
    "outDir": "./dist" /* Specify an output folder for all emitted files. */,
    // "removeComments": true,                           /* Disable emitting comments. */
    // "importHelpers": true,                            /* Allow importing helper functions from tslib once per project, instead of including them per-file. */
    // "downlevelIteration": true,                       /* Emit more compliant, but verbose and less performant JavaScript for iteration. */
    // "sourceRoot": "",                                 /* Specify the root path for debuggers to find the reference source code. */
    // "mapRoot": "",                                    /* Specify the location where debugger should locate map files instead of generated locations. */
    // "inlineSources": true,                            /* Include source code in the sourcemaps inside the emitted JavaScript. */
    // "emitBOM": true,                                  /* Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files. */
    // "newLine": "crlf",                                /* Set the newline character for emitting files. */
    // "stripInternal": true,                            /* Disable emitting declarations that have '@internal' in their JSDoc comments. */
    // "noEmitHelpers": true,                            /* Disable generating custom helper functions like '__extends' in compiled output. */
    // "noEmitOnError": true,                            /* Disable emitting files if any type checking errors are reported. */
    // "preserveConstEnums": true,                       /* Disable erasing 'const enum' declarations in generated code. */
    // "declarationDir": "./",                           /* Specify the output directory for generated declaration files. */

    /* Interop Constraints */
    // "isolatedModules": true,                          /* Ensure that each file can be safely transpiled without relying on other imports. */
    // "verbatimModuleSyntax": true,                     /* Do not transform or elide any imports or exports not marked as type-only, ensuring they are written in the output file's format based on the 'module' setting. */
    // "isolatedDeclarations": true,                     /* Require sufficient annotation on exports so other tools can trivially generate declaration files. */
    // "erasableSyntaxOnly": true,                       /* Do not allow runtime constructs that are not part of ECMAScript. */
    // "allowSyntheticDefaultImports": true,             /* Allow 'import x from y' when a module doesn't have a default export. */
    "esModuleInterop": true /* Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility. */,
    // "preserveSymlinks": true,                         /* Disable resolving symlinks to their realpath. This correlates to the same flag in node. */
    "forceConsistentCasingInFileNames": true /* Ensure that casing is correct in imports. */,

    /* Type Checking */
    "strict": true /* Enable all strict type-checking options. */,
    // "noImplicitAny": true,                            /* Enable error reporting for expressions and declarations with an implied 'any' type. */
    // "strictNullChecks": true,                         /* When type checking, take into account 'null' and 'undefined'. */
    // "strictFunctionTypes": true,                      /* When assigning functions, check to ensure parameters and the return values are subtype-compatible. */
    // "strictBindCallApply": true,                      /* Check that the arguments for 'bind', 'call', and 'apply' methods match the original function. */
    // "strictPropertyInitialization": true,             /* Check for class properties that are declared but not set in the constructor. */
    // "strictBuiltinIteratorReturn": true,              /* Built-in iterators are instantiated with a 'TReturn' type of 'undefined' instead of 'any'. */
    // "noImplicitThis": true,                           /* Enable error reporting when 'this' is given the type 'any'. */
    // "useUnknownInCatchVariables": true,               /* Default catch clause variables as 'unknown' instead of 'any'. */
    // "alwaysStrict": true,                             /* Ensure 'use strict' is always emitted. */
    // "noUnusedLocals": true,                           /* Enable error reporting when local variables aren't read. */
    // "noUnusedParameters": true,                       /* Raise an error when a function parameter isn't read. */
    // "exactOptionalPropertyTypes": true,               /* Interpret optional property types as written, rather than adding 'undefined'. */
    // "noImplicitReturns": true,                        /* Enable error reporting for codepaths that do not explicitly return in a function. */
    // "noFallthroughCasesInSwitch": true,               /* Enable error reporting for fallthrough cases in switch statements. */
    // "noUncheckedIndexedAccess": true,                 /* Add 'undefined' to a type when accessed using an index. */
    // "noImplicitOverride": true,                       /* Ensure overriding members in derived classes are marked with an override modifier. */
    // "noPropertyAccessFromIndexSignature": true,       /* Enforces using indexed accessors for keys declared using an indexed type. */
    // "allowUnusedLabels": true,                        /* Disable error reporting for unused labels. */
    // "allowUnreachableCode": true,                     /* Disable error reporting for unreachable code. */

    /* Completeness */
    // "skipDefaultLibCheck": true,                      /* Skip type checking .d.ts files that are included with TypeScript. */
    "skipLibCheck": true /* Skip type checking all .d.ts files. */

}
}

================================================
FILE: .dockerignore
================================================

# Node.js

node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs

dist
build

# Development files

.env
.env.local
.env.development
.env.test
.env.production

# Git

.git
.gitignore

# Development tools

.vscode
.idea
_.swp
_.swo
\*~

# OS generated files

.DS*Store
.DS_Store?
.*\*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs

logs
\*.log

# Runtime data

pids
_.pid
_.seed
\*.pid.lock

# Coverage directory used by tools like istanbul

coverage
\*.lcov

# Documentation

README.md
\*.md

# CI/CD

.github

# Docker

Dockerfile
.dockerignore

# Development dependencies

nodemon.json

================================================
FILE: .env.example
================================================
NODE_ENV=development

BOT_TOKEN=
HTTPS_PROXY=

DATABASE_URL=
DIRECT_URL=

SUI_NETWORK=testnet
MASTER_WALLET=

TRENDING_CHANNEL_ID=

================================================
FILE: prisma/schema.prisma
================================================
generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
}

model BoostOrder {
id String @id @default(cuid())
telegramChatId BigInt
userId String // Telegram user ID for filtering user orders
tokenAddress String
tgUrl String

// Additional editable fields
emoji String?
website String?
telegramHandle String?
xHandle String?

boostPackage String
boostDurationHours Int
priceSui Float

paymentAddress String @unique
paymentPrivateKey String
paymentStatus PaymentStatus @default(PENDING)

paymentTransactionHash String?
refundTransactionHash String?
refundAddress String?

boostStartedAt DateTime?
boostEndsAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

enum PaymentStatus {
PENDING
PROCESSING
CONFIRMED
EXPIRED
}

================================================
FILE: prisma/migrations/migration_lock.toml
================================================

# Please do not edit this file manually

# It should be added in your version-control system (e.g., Git)

provider = "postgresql"

================================================
FILE: prisma/migrations/20250625053909_init/migration.sql
================================================
-- CreateTable
CREATE TABLE "Article" (
"id" SERIAL NOT NULL,
"title" TEXT NOT NULL,
"body" TEXT,
"authorId" INTEGER NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")

);

================================================
FILE: prisma/migrations/20250625054123_init/migration.sql
================================================
-- AlterTable
ALTER TABLE "Article" ADD COLUMN "description" TEXT;

================================================
FILE: prisma/migrations/20250625060258_init/migration.sql
================================================
-- CreateTable
CREATE TABLE "User" (
"id" SERIAL NOT NULL,
"email" TEXT NOT NULL,
"name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")

);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

================================================
FILE: prisma/migrations/20250625062711_update/migration.sql
================================================
-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramId" INTEGER;

================================================
FILE: prisma/migrations/20250625145249_add_boost_order_table/migration.sql
================================================
/\*
Warnings:

- You are about to drop the `Article` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

\*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Article" DROP CONSTRAINT "Article_authorId_fkey";

-- DropTable
DROP TABLE "Article";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "BoostOrder" (
"id" TEXT NOT NULL,
"telegramChatId" BIGINT NOT NULL,
"tokenAddress" TEXT NOT NULL,
"tgUrl" TEXT NOT NULL,
"boostPackage" TEXT NOT NULL,
"boostDurationHours" INTEGER NOT NULL,
"priceSui" DOUBLE PRECISION NOT NULL,
"paymentAddress" TEXT NOT NULL,
"paymentPrivateKey" TEXT NOT NULL,
"paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
"boostStartedAt" TIMESTAMP(3),
"boostEndsAt" TIMESTAMP(3),
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoostOrder_pkey" PRIMARY KEY ("id")

);

-- CreateIndex
CREATE UNIQUE INDEX "BoostOrder_paymentAddress_key" ON "BoostOrder"("paymentAddress");

================================================
FILE: prisma/migrations/20250625161025_add_transaction_fields/migration.sql
================================================
-- AlterTable
ALTER TABLE "BoostOrder" ADD COLUMN "paymentTransactionHash" TEXT,
ADD COLUMN "refundAddress" TEXT,
ADD COLUMN "refundTransactionHash" TEXT;

================================================
FILE: prisma/migrations/20250626031632_update_payment_status_enum/migration.sql
================================================
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';

================================================
FILE: prisma/migrations/20250626084929_add_user_and_edit_fields/migration.sql
================================================
/\*
Warnings:

- Added the required column `userId` to the `BoostOrder` table without a default value. This is not possible if the table is not empty.

\*/
-- AlterTable
ALTER TABLE "BoostOrder" ADD COLUMN "emoji" TEXT,
ADD COLUMN "telegramHandle" TEXT,
ADD COLUMN "userId" TEXT NOT NULL,
ADD COLUMN "website" TEXT,
ADD COLUMN "xHandle" TEXT;

================================================
FILE: src/commands/active.ts
================================================
import { Context, Markup } from "telegraf";
import { getUserActiveOrders } from "../lib/db";
import { createTokenAddressLink } from "../lib/utils";

const formatActiveOrder = (order: any, index: number) => {
const tokenDisplay = createTokenAddressLink(order.tokenAddress);
const endTime = order.boostEndsAt
? new Date(order.boostEndsAt).toLocaleString()
: "Unknown";
const hoursLeft = order.boostEndsAt
? Math.max(
0,
Math.ceil(
(new Date(order.boostEndsAt).getTime() - new Date().getTime()) /
(1000 _ 60 _ 60)
)
)
: 0;

return `🚀 <b>Active Order #${index + 1}</b>
💎 <b>Token:</b> ${tokenDisplay}
📱 <b>Telegram:</b> ${order.tgUrl}
⏰ <b>Ends:</b> ${endTime}
⏳ <b>Time Left:</b> ${hoursLeft}h
💰 <b>Paid:</b> ${order.priceSui} SUI`;
};

export const activeCommand = async (ctx: Context) => {
if (!ctx.from) {
await ctx.reply("❌ Unable to identify user.");
return;
}

try {
const userId = ctx.from.id.toString();
const activeOrders = await getUserActiveOrders(userId);

    if (activeOrders.length === 0) {
      await ctx.reply(
        `🚀 <b>ACTIVE ORDERS</b>

🔍 <i>No active boost orders found</i>

You don't have any currently running boost campaigns. Use /start to create a new boost order!`,
{
parse_mode: "HTML",
reply_markup: Markup.inlineKeyboard([
[Markup.button.callback("➕ Create New Order", "new_order")],
[Markup.button.callback("📋 All Orders", "all_orders")],
]).reply_markup,
}
);
return;
}

    let message = `🚀 <b>ACTIVE ORDERS</b> (${activeOrders.length} running)

━━━━━━━━━━━━━━━━━━━━

`;

    activeOrders.forEach((order, index) => {
      message += formatActiveOrder(order, index);

      // Add divider between orders (but not after the last one)
      if (index < activeOrders.length - 1) {
        message += "\n\n━━━━━━━━━━━━━━━━━━━━\n\n";
      } else {
        message += "\n\n";
      }
    });

    // Build keyboard with edit buttons for each active order
    const keyboardRows = [];

    // Add edit buttons for each active order
    activeOrders.forEach((order, index) => {
      keyboardRows.push([
        Markup.button.callback(
          `✏️ Edit Order #${index + 1}`,
          `edit_order_${order.id}`
        ),
      ]);
    });

    // Add navigation buttons
    keyboardRows.push([
      Markup.button.callback("🔄 Refresh", "refresh_active"),
      Markup.button.callback("📋 All Orders", "all_orders"),
    ]);
    keyboardRows.push([Markup.button.callback("➕ New Order", "new_order")]);

    const keyboard = Markup.inlineKeyboard(keyboardRows);

    await ctx.reply(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

} catch (error) {
console.error("Error fetching active orders:", error);
await ctx.reply(
"❌ Error fetching your active orders. Please try again later."
);
}
};

================================================
FILE: src/commands/cancel.ts
================================================
import { Scenes } from "telegraf";
import { WizardState } from "../lib/types";

export const cancelCommand = async (ctx: Scenes.WizardContext<WizardState>) => {
await ctx.reply(
`❌ <b>ORDER CANCELLED</b>

<i>Your boosting request has been cancelled</i>

You can use /start to begin a new request.`,
{ parse_mode: "HTML" }
);
return ctx.scene.leave();
};

================================================
FILE: src/commands/help.ts
================================================
import { Context } from "telegraf";

export const helpCommand = async (ctx: Context) => {
const helpMessage = `🆘 <b>HELP - AVAILABLE COMMANDS</b>

<b>📋 Order Management:</b>
/start - Create a new boost order
/orders - View all your orders (active + completed)
/active - View currently running boost campaigns
/history - View completed boost orders
/cancel - Cancel current order process

<b>📖 Information:</b>
/help - Show this help message
/info - About this bot

<b>✏️ Editing Orders:</b>
• Click [✏️ Edit] buttons on active orders
• Update: Token, Emoji, Website, Telegram, X handle
• Only active boost campaigns can be edited

<b>💡 Quick Tips:</b>
• Use /active to see orders currently boosting
• Edit orders anytime while they're running
• Check /history for completed campaigns
• Each order gets a 🐳 emoji by default

<b>Need help?</b> Contact our support team!`;

await ctx.reply(helpMessage, { parse_mode: "HTML" });
};

================================================
FILE: src/commands/history.ts
================================================
import { Context, Markup } from "telegraf";
import { getUserCompletedOrders } from "../lib/db";
import { createTokenAddressLink } from "../lib/utils";

const formatCompletedOrder = (order: any, index: number) => {
const tokenDisplay = createTokenAddressLink(order.tokenAddress);
const endedAt = order.boostEndsAt
? new Date(order.boostEndsAt).toLocaleDateString()
: "Unknown";
const createdAt = new Date(order.createdAt).toLocaleDateString();

return `✅ <b>Completed Order #${index + 1}</b>
💎 <b>Token:</b> ${tokenDisplay}
📱 <b>Telegram:</b> ${order.tgUrl}
⏱️ <b>Duration:</b> ${order.boostDurationHours}h
💰 <b>Price:</b> ${order.priceSui} SUI
📅 <b>Created:</b> ${createdAt}
🏁 <b>Ended:</b> ${endedAt}`;
};

export const historyCommand = async (ctx: Context) => {
if (!ctx.from) {
await ctx.reply("❌ Unable to identify user.");
return;
}

try {
const userId = ctx.from.id.toString();
const completedOrders = await getUserCompletedOrders(userId);

    if (completedOrders.length === 0) {
      await ctx.reply(
        `📋 <b>ORDER HISTORY</b>

🔍 <i>No completed orders found</i>

You don't have any completed boost campaigns yet. Use /start to create your first boost order!`,
{
parse_mode: "HTML",
reply_markup: Markup.inlineKeyboard([
[Markup.button.callback("➕ Create New Order", "new_order")],
[Markup.button.callback("🚀 Active Orders", "active_orders")],
]).reply_markup,
}
);
return;
}

    let message = `📋 <b>ORDER HISTORY</b> (${completedOrders.length} completed)

━━━━━━━━━━━━━━━━━━━━

`;

    // Show first 5 orders
    const displayOrders = completedOrders.slice(0, 5);

    displayOrders.forEach((order, index) => {
      message += formatCompletedOrder(order, index);

      // Add divider between orders (but not after the last one)
      if (index < displayOrders.length - 1) {
        message += "\n\n━━━━━━━━━━━━━━━━━━━━\n\n";
      } else {
        message += "\n\n";
      }
    });

    if (completedOrders.length > 5) {
      message += `<i>... and ${completedOrders.length - 5} more orders</i>\n\n`;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback("🔄 Refresh", "refresh_history"),
        Markup.button.callback("🚀 Active", "active_orders"),
      ],
      [
        Markup.button.callback("📋 All Orders", "all_orders"),
        Markup.button.callback("➕ New Order", "new_order"),
      ],
    ]);

    await ctx.reply(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

} catch (error) {
console.error("Error fetching order history:", error);
await ctx.reply(
"❌ Error fetching your order history. Please try again later."
);
}
};

================================================
FILE: src/commands/info.ts
================================================
import { Context, Markup } from "telegraf";

export const infoCommand = async (ctx: Context) => {
const infoMessage = `ℹ️ <b>SUI BOOST ACCELERATOR</b>

🚀 <b>Premium Token Promotion Bot</b>
Boost your Sui network tokens with guaranteed visibility and professional marketing campaigns.

<b>🎯 Features:</b>
• Lightning-fast boost campaigns
• Multiple duration options (4-48 hours)
• Flexible pricing packages
• Real-time order management
• Editable campaign details

<b>💎 Why Choose Us:</b>
• Proven boost system on Sui network
• Professional marketing reach
• Secure payment processing
• 24/7 automated service
• User-friendly interface

<b>🔧 Technical Info:</b>
• Built on Sui blockchain
• Secure wallet integration
• Real-time transaction monitoring
• Advanced order management

<b>👨‍💻 Developed by:</b>
<i>Neonet AI Development Team</i>

Professional blockchain solutions and bot development services.

<b>📞 Support:</b>
For technical assistance or partnership inquiries, contact our development team.`;

await ctx.reply(infoMessage, {
parse_mode: "HTML",
reply_markup: Markup.inlineKeyboard([
[Markup.button.callback("🚀 Start Boosting", "new_order")],
[Markup.button.callback("📋 My Orders", "all_orders")],
]).reply_markup,
});
};

================================================
FILE: src/commands/order.ts
================================================

================================================
FILE: src/commands/orders.ts
================================================
import { Context, Markup } from "telegraf";
import { getUserOrders } from "../lib/db";
import { createTokenAddressLink } from "../lib/utils";

const formatOrderStatus = (order: any) => {
if (order.boostEndsAt && new Date() > new Date(order.boostEndsAt)) {
return "✅ Completed";
}
return "🚀 Active";
};

const formatOrderCard = (order: any, index: number) => {
const status = formatOrderStatus(order);
const tokenDisplay = createTokenAddressLink(order.tokenAddress);
const createdAt = new Date(order.createdAt).toLocaleDateString();

return `📦 <b>Order #${index + 1}</b> - ${status}
💎 <b>Token:</b> ${tokenDisplay}
📱 <b>Telegram:</b> ${order.tgUrl}
⏱️ <b>Duration:</b> ${order.boostDurationHours}h
💰 <b>Price:</b> ${order.priceSui} SUI
📅 <b>Created:</b> ${createdAt}`;
};

export const ordersCommand = async (ctx: Context) => {
if (!ctx.from) {
await ctx.reply("❌ Unable to identify user.");
return;
}

try {
const userId = ctx.from.id.toString();
const orders = await getUserOrders(userId);

    if (orders.length === 0) {
      await ctx.reply(
        `📋 <b>YOUR ORDERS</b>

🔍 <i>No orders found</i>

You haven't created any boost orders yet. Use /start to create your first boost order!`,
{ parse_mode: "HTML" }
);
return;
}

    const activeOrders = orders.filter(
      (order) => order.boostEndsAt && new Date() < new Date(order.boostEndsAt)
    );

    const completedOrders = orders.filter(
      (order) => order.boostEndsAt && new Date() > new Date(order.boostEndsAt)
    );

    let message = `📋 <b>YOUR ORDERS</b> (${orders.length} total)

🚀 <b>Active:</b> ${activeOrders.length}
✅ <b>Completed:</b> ${completedOrders.length}

━━━━━━━━━━━━━━━━━━━━

`;

    // Show first 5 orders
    const displayOrders = orders.slice(0, 5);

    displayOrders.forEach((order, index) => {
      message += formatOrderCard(order, index);

      // Add divider between orders (but not after the last one)
      if (index < displayOrders.length - 1) {
        message += "\n\n━━━━━━━━━━━━━━━━━━━━\n\n";
      } else {
        message += "\n\n";
      }
    });

    if (orders.length > 5) {
      message += `<i>... and ${orders.length - 5} more orders</i>\n\n`;
    }

    // Build keyboard with edit buttons for active orders
    const keyboardRows = [];

    // Add edit buttons for active orders
    displayOrders.forEach((order, index) => {
      const isActive =
        order.boostEndsAt && new Date() < new Date(order.boostEndsAt);
      if (isActive) {
        keyboardRows.push([
          Markup.button.callback(
            `✏️ Edit Order #${index + 1}`,
            `edit_order_${order.id}`
          ),
        ]);
      }
    });

    // Add navigation buttons
    keyboardRows.push([
      Markup.button.callback("🚀 Active Only", "filter_active"),
      Markup.button.callback("✅ History", "filter_completed"),
    ]);
    keyboardRows.push([
      Markup.button.callback("🔄 Refresh", "refresh_orders"),
      Markup.button.callback("➕ New Order", "new_order"),
    ]);

    const keyboard = Markup.inlineKeyboard(keyboardRows);

    await ctx.reply(message, {
      reply_markup: keyboard.reply_markup,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

} catch (error) {
console.error("Error fetching orders:", error);
await ctx.reply("❌ Error fetching your orders. Please try again later.");
}
};

================================================
FILE: src/commands/start.ts
================================================
import { Scenes } from "telegraf";
import { WizardState } from "../lib/types";
import { welcomeStep } from "../steps/welcome-step";

export const startCommand = async (ctx: Scenes.WizardContext<WizardState>) => {
if (ctx.wizard.cursor === 5) {
await ctx.reply(
"⚠️ You cannot restart during payment. Use /cancel to cancel current order and start again."
);
return;
}
ctx.scene.session.token = undefined;
ctx.scene.session.url = undefined;
ctx.scene.session.package = undefined;
ctx.scene.session.price = undefined;
ctx.scene.session.duration = undefined;

ctx.wizard.selectStep(0);
return await welcomeStep(ctx);
};

================================================
FILE: src/handlers/field-edit.ts
================================================
import { Context, Markup } from "telegraf";
import { updateOrderField, getOrderById } from "../lib/db";
import { isValidTelegramUrl } from "../lib/utils";

// Store pending edits temporarily (in production, you might want to use a proper session store)
const pendingEdits = new Map<string, { orderId: string; field: string }>();

export const handleFieldEditCallback = async (ctx: Context, data: string) => {
if (!ctx.from) return;

const userId = ctx.from.id.toString();

// Handle field selection (edit*token*, edit*emoji*, etc.)
if (data.startsWith("edit*")) {
const parts = data.split("*");
const field = parts[1]; // token, emoji, website, telegram, x
const orderId = parts[2];

    // Store the pending edit
    pendingEdits.set(userId, { orderId, field });

    const fieldPrompts = {
      token: {
        title: "💎 TOKEN ADDRESS",
        prompt:
          "Send the new token contract address:\n\n<i>Example: 0xc1a35b6a9771e6eb69e3b36e921a3a373e6d33e6f863dab6949ed3c2d1228f73::neonet::NEONET</i>",
      },
      emoji: {
        title: "😀 EMOJI",
        prompt:
          "Send the emoji for your token:\n\n<i>Example: 🚀 or 💎 or any emoji you prefer</i>",
      },
      website: {
        title: "🌐 WEBSITE",
        prompt: "Send the website URL:\n\n<i>Example: https://mytoken.com</i>",
      },
      telegram: {
        title: "📱 TELEGRAM",
        prompt:
          "Send the Telegram group/channel link:\n\n<i>Example: https://t.me/mytoken</i>",
      },
      x: {
        title: "🐦 X (TWITTER)",
        prompt:
          "Send the X/Twitter handle or URL:\n\n<i>Example: @mytoken or https://x.com/mytoken</i>",
      },
    };

    const fieldInfo = fieldPrompts[field as keyof typeof fieldPrompts];
    if (!fieldInfo) return;

    await ctx.reply(
      `✏️ <b>${fieldInfo.title}</b>\n\n${fieldInfo.prompt}\n\n<i>Send /cancel to cancel editing</i>`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("❌ Cancel", "cancel_field_edit")],
        ]).reply_markup,
      }
    );
    return;

}

// Handle cancel
if (data === "cancel_field_edit") {
pendingEdits.delete(userId);
await ctx.reply("❌ Field editing cancelled.", { parse_mode: "HTML" });
return;
}
};

export const handleFieldEditMessage = async (
ctx: Context,
next: () => Promise<void>
) => {
if (!ctx.from || !ctx.message || !("text" in ctx.message)) {
return next();
}

const userId = ctx.from.id.toString();
const pendingEdit = pendingEdits.get(userId);

if (!pendingEdit) {
return next(); // No pending edit for this user, let other handlers process
}

const newValue = ctx.message.text.trim();
const { orderId, field } = pendingEdit;

// Handle cancel command
if (newValue.toLowerCase() === "/cancel") {
pendingEdits.delete(userId);
await ctx.reply("❌ Field editing cancelled.", { parse_mode: "HTML" });
return;
}

try {
// Validate input based on field type
const validationResult = validateFieldInput(field, newValue);
if (!validationResult.valid) {
await ctx.reply(
`❌ <b>Invalid ${field.toUpperCase()}</b>\n\n${
          validationResult.error
        }\n\nPlease try again or send /cancel to cancel.`,
{ parse_mode: "HTML" }
);
return;
}

    // Check if order exists and belongs to user
    const order = await getOrderById(orderId);
    if (!order || order.userId !== userId) {
      await ctx.reply("❌ Order not found or access denied.", {
        parse_mode: "HTML",
      });
      pendingEdits.delete(userId);
      return;
    }

    // Update the field
    await updateOrderField(orderId, field, validationResult.value);

    // Clear pending edit
    pendingEdits.delete(userId);

    // Send success message
    const fieldNames = {
      token: "Token Address",
      emoji: "Emoji",
      website: "Website",
      telegram: "Telegram",
      x: "X (Twitter)",
    };

    await ctx.reply(
      `✅ <b>${
        fieldNames[field as keyof typeof fieldNames]
      } Updated!</b>\n\nNew value: ${validationResult.value}`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("📋 View Orders", "all_orders")],
        ]).reply_markup,
      }
    );

} catch (error) {
console.error("Error updating order field:", error);
await ctx.reply("❌ Error updating field. Please try again later.", {
parse_mode: "HTML",
});
pendingEdits.delete(userId);
}
};

const validateFieldInput = (
field: string,
value: string
): { valid: false; error: string } | { valid: true; value: string } => {
if (!value || value.length === 0) {
return { valid: false, error: "Value cannot be empty." };
}

switch (field) {
case "token":
// Basic token address validation
if (value.length < 10) {
return { valid: false, error: "Token address is too short." };
}
if (!value.includes("::")) {
return {
valid: false,
error: "Invalid Sui token format. Should contain '::'",
};
}
return { valid: true, value };

    case "emoji":
      // Simple emoji validation - just check it's not too long
      if (value.length > 10) {
        return {
          valid: false,
          error: "Emoji should be short (max 10 characters).",
        };
      }
      return { valid: true, value };

    case "website":
      // Basic URL validation
      if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return {
          valid: false,
          error: "Website must start with http:// or https://",
        };
      }
      return { valid: true, value };

    case "telegram":
      // Use existing telegram URL validation
      if (!isValidTelegramUrl(value)) {
        return {
          valid: false,
          error: "Invalid Telegram URL. Must be a valid t.me link.",
        };
      }
      return { valid: true, value };

    case "x":
      // X/Twitter handle validation
      if (value.startsWith("@")) {
        return { valid: true, value };
      }
      if (
        value.startsWith("https://x.com/") ||
        value.startsWith("https://twitter.com/")
      ) {
        return { valid: true, value };
      }
      if (value.match(/^[a-zA-Z0-9_]+$/)) {
        return { valid: true, value: `@${value}` }; // Add @ prefix if missing
      }
      return {
        valid: false,
        error: "Invalid X handle. Use @username or full URL.",
      };

    default:
      return { valid: false, error: "Unknown field type." };

}
};

================================================
FILE: src/handlers/order-callbacks.ts
================================================
import { Context, Markup } from "telegraf";
import { ordersCommand } from "../commands/orders";
import { activeCommand } from "../commands/active";
import { historyCommand } from "../commands/history";
import { handleFieldEditCallback } from "./field-edit";

const handleOrderEdit = async (ctx: Context, orderId: string) => {
const editMenu = Markup.inlineKeyboard([
[
Markup.button.callback("💎 Token Address", `edit_token_${orderId}`),
Markup.button.callback("😀 Emoji", `edit_emoji_${orderId}`),
],
[
Markup.button.callback("🌐 Website", `edit_website_${orderId}`),
Markup.button.callback("📱 Telegram", `edit_telegram_${orderId}`),
],
[Markup.button.callback("🐦 X (Twitter)", `edit_x_${orderId}`)],
[Markup.button.callback("❌ Cancel", "cancel_edit")],
]);

await ctx.reply(
`✏️ <b>EDIT ORDER</b>

Select which field you want to edit:

💎 <b>Token Address</b> - Update the token contract address
😀 <b>Emoji</b> - Add or change the token emoji
🌐 <b>Website</b> - Add or update website URL
📱 <b>Telegram</b> - Update Telegram group/channel link
🐦 <b>X (Twitter)</b> - Add or update X/Twitter handle

Choose a field to edit:`,
{
reply_markup: editMenu.reply_markup,
parse_mode: "HTML",
}
);
};

export const handleOrderCallbacks = async (ctx: Context) => {
if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
return;
}

const data = ctx.callbackQuery.data;

try {
await ctx.answerCbQuery();

    switch (data) {
      case "filter_active":
        await activeCommand(ctx);
        break;

      case "filter_completed":
        await historyCommand(ctx);
        break;

      case "refresh_orders":
      case "all_orders":
        await ordersCommand(ctx);
        break;

      case "refresh_active":
        await activeCommand(ctx);
        break;

      case "refresh_history":
        await historyCommand(ctx);
        break;

      case "active_orders":
        await activeCommand(ctx);
        break;

      case "new_order":
        await ctx.reply(
          "🚀 To create a new order, please use /start command.",
          { parse_mode: "HTML" }
        );
        break;

      case "cancel_edit":
        await ctx.reply("❌ Edit cancelled.", { parse_mode: "HTML" });
        break;

      default:
        // Check if it's an edit order callback
        if (data.startsWith("edit_order_")) {
          const orderId = data.replace("edit_order_", "");
          await handleOrderEdit(ctx, orderId);
          return;
        }

        // Check if it's a field edit callback
        if (data.startsWith("edit_") || data === "cancel_field_edit") {
          await handleFieldEditCallback(ctx, data);
          return;
        }

        // Don't handle unknown callbacks, let other handlers process them
        return;
    }

} catch (error) {
console.error("Error handling order callback:", error);
await ctx.reply("❌ Something went wrong. Please try again.");
}
};

================================================
FILE: src/lib/constants.ts
================================================
export const MASTER_WALLET = process.env.MASTER_WALLET!;
export const ORDER_EXPIRATION_IN_MS = 10 _ 60 _ 1000;
export const MINIMUM_BALANCE_FOR_GAS = 0.0035;

export const SUI_NETWORK = (process.env.SUI_NETWORK || "mainnet") as
| "mainnet"
| "testnet"
| "devnet"
| "localnet";

export const TRENDING_CHANNEL_ID = process.env.TRENDING_CHANNEL_ID;

export const PACKAGES = [
{ duration: 4, price: 0.1, label: "4 hours | 0.1 SUI" },
{ duration: 8, price: 0.2, label: "8 hours | 0.2 SUI" },
{ duration: 12, price: 0.4, label: "12 hours | 0.4 SUI" },
{ duration: 24, price: 0.8, label: "24 hours | 0.8 SUI" },
{ duration: 48, price: 1, label: "48 hours | 1 SUI" },
];

export const PRICES: Record<number, number> = PACKAGES.reduce((acc, pkg) => {
acc[pkg.duration] = pkg.price;
return acc;
}, {} as Record<number, number>);

================================================
FILE: src/lib/db.ts
================================================
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const createBoostOrder = async (data: Prisma.BoostOrderCreateInput) => {
return await prisma.boostOrder.create({
data,
});
};

export const getBoostOrderByPaymentAddress = async (paymentAddress: string) => {
return await prisma.boostOrder.findUnique({
where: {
paymentAddress,
},
});
};

export const getBoostOrderByTokenAddress = async (tokenAddress: string) => {
return await prisma.boostOrder.findFirst({
where: {
tokenAddress,
paymentStatus: "CONFIRMED",
boostEndsAt: {
gt: new Date(),
},
},
});
};

export const updateBoostOrder = async (
paymentAddress: string,
data: Prisma.BoostOrderUpdateInput
) => {
return await prisma.boostOrder.update({
where: {
paymentAddress,
},
data,
});
};

export const getUserOrders = async (userId: string) => {
return await prisma.boostOrder.findMany({
where: {
userId,
paymentStatus: "CONFIRMED",
},
orderBy: {
createdAt: "desc",
},
});
};

export const getUserActiveOrders = async (userId: string) => {
return await prisma.boostOrder.findMany({
where: {
userId,
paymentStatus: "CONFIRMED",
boostEndsAt: {
gt: new Date(),
},
},
orderBy: {
createdAt: "desc",
},
});
};

export const getUserCompletedOrders = async (userId: string) => {
return await prisma.boostOrder.findMany({
where: {
userId,
paymentStatus: "CONFIRMED",
boostEndsAt: {
lt: new Date(),
},
},
orderBy: {
createdAt: "desc",
},
});
};

export const updateOrderField = async (
orderId: string,
field: string,
value: string
) => {
const updateData: any = {};
updateData[field] = value;

return await prisma.boostOrder.update({
where: {
id: orderId,
},
data: updateData,
});
};

export const getOrderById = async (orderId: string) => {
return await prisma.boostOrder.findUnique({
where: {
id: orderId,
},
});
};

================================================
FILE: src/lib/sui.ts
================================================
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import {
getFullnodeUrl,
SuiClient,
SuiTransactionBlockResponse,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { SUI_NETWORK } from "./constants";
import { IncomingTransactionDetails } from "./types";

const createSuiClient = () => {
const url = getFullnodeUrl(SUI_NETWORK);
return new SuiClient({ url });
};

export const loadWallet = (
privateKeyString: string
): {
keypair: Ed25519Keypair;
privateKey: string;
publicKey: string;
address: string;
} => {
// Decode the suiprivkey1... format to get the raw key data
const { secretKey } = decodeSuiPrivateKey(privateKeyString);

// Create keypair from the secret key
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const publicKey = keypair.getPublicKey().toBase64();
const address = keypair.getPublicKey().toSuiAddress();

return { keypair, privateKey: privateKeyString, publicKey, address };
};

export const getIncomingTransactions = async (
recipientAddress: string
): Promise<SuiTransactionBlockResponse[]> => {
const client = createSuiClient();

const result = await client.queryTransactionBlocks({
filter: {
ToAddress: recipientAddress,
},
options: {
showInput: true,
showEffects: true,
showBalanceChanges: true,
},
order: "descending", // Get the most recent transactions first
});

return result.data;
};

export const createWallet = (): {
privateKey: string;
publicKey: string;
address: string;
} => {
const keypair = new Ed25519Keypair();
const privateKey = keypair.getSecretKey();
const publicKey = keypair.getPublicKey().toBase64();
const address = keypair.getPublicKey().toSuiAddress();

return { privateKey, publicKey, address };
};

export const sendSui = async (
privateKeyString: string,
recipientAddress: string
): Promise<
| {
success: true;
transactionHash: string;
from: string;
to: string;
result: SuiTransactionBlockResponse;
}
| {
success: false;
error: string;
from: null;
to: string;
}

> => {
> try {

    const wallet = loadWallet(privateKeyString);
    const client = createSuiClient();
    const tx = new Transaction();
    tx.transferObjects([tx.gas], recipientAddress);
    const result = await client.signAndExecuteTransaction({
      signer: wallet.keypair,
      transaction: tx,
    });

    return {
      success: true,
      transactionHash: result.digest,
      from: wallet.address,
      to: recipientAddress,
      result,
    };

} catch (error) {
return {
success: false,
error: (error as Error).message,
from: null,
to: recipientAddress,
};
}
};

export const getLastIncomingTx = async (
recipientAddress: string
): Promise<IncomingTransactionDetails | null> => {
try {
const transactions = await getIncomingTransactions(recipientAddress);

    // If there are no transactions, return null.
    if (!transactions || transactions.length === 0) {
      return null;
    }

    const mostRecentTx = transactions[0];
    const sender = mostRecentTx.transaction?.data.sender;
    const transactionHash = mostRecentTx.digest;

    if (!sender || !mostRecentTx.balanceChanges) {
      return null;
    }

    // Find the SUI that was sent to our recipient address.
    const recipientBalanceChange = mostRecentTx.balanceChanges.find(
      (change) =>
        typeof change.owner === "object" && // Ensure owner is an object
        "AddressOwner" in change.owner && // Now this check is safe
        change.owner.AddressOwner === recipientAddress &&
        change.coinType === "0x2::sui::SUI" &&
        BigInt(change.amount) > 0
    );

    if (!recipientBalanceChange) {
      return null;
    }

    const amountInMIST = BigInt(recipientBalanceChange.amount);
    const amountInSui = Number(amountInMIST) / Number(MIST_PER_SUI);

    return {
      sender,
      amountInSui,
      transactionHash,
    };

} catch (error) {
console.error("Error fetching transaction details:", error);
return null;
}
};

================================================
FILE: src/lib/types.ts
================================================
import { Scenes } from "telegraf";

export interface WizardState extends Scenes.WizardSessionData {
token?: string;
url?: string;
package?: string;
price?: number;
duration?: number;
wallet?: string;
}

export interface IncomingTransactionDetails {
sender: string;
amountInSui: number;
transactionHash: string;
}

================================================
FILE: src/lib/utils.ts
================================================

export const isValidSuiAddress = (address: string) => {
if (!address?.trim()) return false;

const addr = address.trim();

if (addr.includes("::")) {
const parts = addr.split("::");
return (
parts.length === 3 &&
/^0x[a-fA-F0-9]{64}$/.test(parts[0]) &&
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parts[1]) &&
/^[a-zA-Z\_][a-zA-Z0-9_]\*$/.test(parts[2])
);
}

return /^0x[a-fA-F0-9]{64}$/.test(addr);
};

export const isValidTelegramUrl = (url: string) => {
if (!url?.trim()) return false;
const trimmedUrl = url.trim();
return (
trimmedUrl.startsWith("https://t.me/") || trimmedUrl.startsWith("t.me/")
);
};

export const extractTicker = (coin: string) => {
const parts = coin.split("::");

return parts.length >= 3 ? parts[2] : "Unknown";
};

export const createTokenAddressLink = (address: string) => {
const ticker = extractTicker(address);
const url = `https://suivision.xyz/coin/${address}`;
return `<a href="${url}">${ticker}</a>`;
};

================================================
FILE: src/steps/final-step.ts
================================================
import { Scenes } from "telegraf";
import { IncomingTransactionDetails, WizardState } from "../lib/types";
import { getBoostOrderByPaymentAddress, updateBoostOrder } from "../lib/db";
import { getLastIncomingTx, sendSui } from "../lib/sui";
import {
MASTER_WALLET,
ORDER_EXPIRATION_IN_MS,
MINIMUM_BALANCE_FOR_GAS,
} from "../lib/constants";
import { BoostOrder } from "@prisma/client";

const successMessage = (
duration: number,
price: number
) => `✅ <b>PAYMENT RECEIVED</b>

<i>Your token boost has been activated!</i>

🚀 <b>Your token is now being boosted</b>

📊 Duration: ${duration} hours
💰 Amount: ${price} SUI

<i>Thank you for using our service!</i>`;

const refund = async (
ctx: Scenes.WizardContext<WizardState>,
order: BoostOrder,
transaction: IncomingTransactionDetails,
message?: string
) => {
if (transaction.amountInSui <= MINIMUM_BALANCE_FOR_GAS) {
await ctx.reply(
"The amount paid is too small to be refunded due to network fees."
);
await updateBoostOrder(order.paymentAddress, { paymentStatus: "EXPIRED" });

    await ctx.answerCbQuery();
    return ctx.scene.leave();

}

const tx = await sendSui(order.paymentPrivateKey, transaction.sender);

if (!tx.success) {
await ctx.reply(
"❌ <b>FAILED TO REFUND</b>\n\n<i>Please contact support</i>",
{ parse_mode: "HTML" }
);

    await ctx.answerCbQuery();

    return ctx.scene.leave();

}

await ctx.reply(
message || "✅ <b>REFUNDED</b>\n\n<i>Your payment has been refunded</i>",
{ parse_mode: "HTML" }
);

await updateBoostOrder(order.paymentAddress, {
paymentStatus: "EXPIRED",
});

await ctx.answerCbQuery();

return ctx.scene.leave();
};

const forward = async (
ctx: Scenes.WizardContext<WizardState>,
order: BoostOrder
) => {
const tx = await sendSui(order.paymentPrivateKey, MASTER_WALLET);

if (!tx.success) {
await ctx.reply(
"❌ <b>FAILED TO SEND SUI</b>\n\n<i>Please contact support</i>",
{ parse_mode: "HTML" }
);

    await updateBoostOrder(order.paymentAddress, {
      paymentStatus: "EXPIRED",
    });

    await ctx.answerCbQuery();

    return ctx.scene.leave();

}

if (tx.success) {
await updateBoostOrder(order.paymentAddress, {
paymentStatus: "CONFIRMED",
boostStartedAt: new Date(),
boostEndsAt: new Date(
Date.now() + order.boostDurationHours _ 60 _ 60 \* 1000
),
paymentTransactionHash: tx.transactionHash,
});

    await ctx.reply(
      successMessage(ctx.scene.session.duration!, ctx.scene.session.price!),
      { parse_mode: "HTML" }
    );

    await ctx.answerCbQuery();

    return ctx.scene.leave();

}
};

export const finalStep = async (ctx: Scenes.WizardContext<WizardState>) => {
if (
ctx.callbackQuery &&
"data" in ctx.callbackQuery &&
ctx.callbackQuery.data === "start_boosting"
) {
const order = await getBoostOrderByPaymentAddress(
ctx.scene.session.wallet!
);

    if (!order) {
      await ctx.reply(
        "❌ <b>ORDER NOT FOUND</b>\n\n<i>Please contact support</i>",
        { parse_mode: "HTML" }
      );

      await ctx.answerCbQuery();

      return ctx.scene.leave();
    }

    if (order.paymentStatus !== "PENDING") {
      await ctx.answerCbQuery("This order has already been processed.");

      return ctx.scene.leave();
    }

    const transaction = await getLastIncomingTx(order.paymentAddress);

    const timeSinceCreation = Date.now() - new Date(order.createdAt).getTime();

    if (transaction && timeSinceCreation > ORDER_EXPIRATION_IN_MS) {
      await updateBoostOrder(order.paymentAddress, {
        paymentStatus: "PROCESSING",
      });
      await refund(
        ctx,
        order,
        transaction,
        "⏰ This order has expired and your payment has been refunded. Please start a new order."
      );
      return;
    }

    if (!transaction) {
      await ctx.reply(
        "❌ <b>PAYMENT NOT DETECTED</b>\n\n<i>Please verify if transaction is confirmed and press '🚀 Start Boosting' again</i>",

        { parse_mode: "HTML" }
      );

      await ctx.answerCbQuery();

      return;
    }

    await updateBoostOrder(order.paymentAddress, {
      paymentStatus: "PROCESSING",
    });

    if (
      transaction.amountInSui > 0 &&
      transaction.amountInSui < order.priceSui
    ) {
      await refund(
        ctx,
        order,
        transaction,
        "⚠️ <b>INSUFFICIENT PAYMENT</b>\n\n<i>The amount sent was less than required for the selected package. Your payment has been refunded.</i>"
      );
    }

    if (transaction.amountInSui >= order.priceSui) {
      await forward(ctx, order);
    }

    await ctx.answerCbQuery();

}
};

================================================
FILE: src/steps/package-step.ts
================================================
import { Markup, Scenes } from "telegraf";
import { PACKAGES } from "../lib/constants";
import { WizardState } from "../lib/types";
import { createTokenAddressLink, isValidTelegramUrl } from "../lib/utils";

const packageMessage = (token: string, url: string) =>
`🚀 <b>BOOST DURATION SELECTION</b>

<i>Choose how long you want to boost your token</i>

💎 <b>Token:</b> ${createTokenAddressLink(token)}
📱 <b>Telegram:</b> ${url}

📊 <b>SELECT BOOST DURATION:</b>

<i>Choose your preferred campaign duration below</i>`;

const packageKeyboard = Markup.inlineKeyboard(
PACKAGES.map((pkg) => [Markup.button.callback(pkg.label, `${pkg.duration}h`)])
);

export const packageStep = async (ctx: Scenes.WizardContext<WizardState>) => {
if (ctx.message && "text" in ctx.message) {
const url = ctx.message.text;

    if (!isValidTelegramUrl(url)) {
      await ctx.reply(
        `❌ <b>INVALID TELEGRAM URL</b>

<i>Please provide a valid Telegram group or channel link</i>

Send a <b>valid t.me link</b>
<i>Example: https://t.me/neonet_agent</i>`,
{ parse_mode: "HTML", link_preview_options: { is_disabled: true } }
);
return;
}

    ctx.scene.session.url = url;

    await ctx.reply(packageMessage(ctx.scene.session.token!, url), {
      reply_markup: packageKeyboard.reply_markup,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    return ctx.wizard.next();

}
};

================================================
FILE: src/steps/payment-step.ts
================================================
import { Markup, Scenes } from "telegraf";
import { WizardState } from "../lib/types";
import { createWallet } from "../lib/sui";
import { createBoostOrder } from "../lib/db";
import { PRICES } from "../lib/constants";
import { createTokenAddressLink } from "../lib/utils";

const paymentMessage = (
token: string,
url: string,
duration: number,
price: number,
address: string
) =>
`💳 <b>PAYMENT CONFIRMATION</b>

<i>Complete your payment to start boosting</i>

📋 <b>ORDER SUMMARY:</b>
💎 <b>Token:</b> ${createTokenAddressLink(token)}
📱 <b>Telegram:</b> ${url}
⏱️ <b>Duration:</b> ${duration} hours
💰 <b>Total:</b> <code>${price} SUI</code>

🔄 <b>PAYMENT INSTRUCTIONS:</b>

1️⃣ Send <b>exactly ${price} SUI</b> to the wallet below
2️⃣ Wait for <b>blockchain confirmation</b>
3️⃣ Click <b>"Start Boosting"</b> button

💼 <b>PAYMENT WALLET:</b> <i>(click to copy)</i>
<code>${address}</code>

⏰ <b>Payment Window:</b> <i>10 minutes</i>

⚠️ <b>IMPORTANT:</b>
<i>• Do NOT send from exchanges
• Use only personal wallets
• Refunds not guaranteed for exchange transfers</i>`;

export const paymentStep = async (ctx: Scenes.WizardContext<WizardState>) => {
if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
const callbackData = ctx.callbackQuery.data;

    const match = callbackData.match(/^(\d+)h$/);

    if (match) {
      const duration = parseInt(match[1]);
      const price = PRICES[duration];

      const wallet = createWallet();

      // Set session values first
      ctx.scene.session.package = `${duration} hours - ${price} SUI`;
      ctx.scene.session.price = price;
      ctx.scene.session.duration = duration;
      ctx.scene.session.wallet = wallet.address;

      await createBoostOrder({
        telegramChatId: ctx.chat?.id ?? 0,
        userId: ctx.from?.id?.toString() ?? "unknown",
        tokenAddress: ctx.scene.session.token!,
        tgUrl: ctx.scene.session.url!,
        emoji: "🐳",
        boostPackage: ctx.scene.session.package!,
        boostDurationHours: ctx.scene.session.duration!,
        priceSui: ctx.scene.session.price!,
        paymentAddress: wallet.address,
        paymentPrivateKey: wallet.privateKey,
        paymentStatus: "PENDING",
      });

      await ctx.answerCbQuery();

      await ctx.editMessageText(
        paymentMessage(
          ctx.scene.session.token!,
          ctx.scene.session.url!,
          ctx.scene.session.duration!,
          ctx.scene.session.price!,
          wallet.address
        ),
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback("🚀 Start Boosting", "start_boosting")],
          ]).reply_markup,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        }
      );
      return ctx.wizard.next();
    }

}
};

================================================
FILE: src/steps/token-step.ts
================================================
import { Markup, Scenes } from "telegraf";
import { WizardState } from "../lib/types";

export const tokenMessage = `💎 <b>TOKEN ADDRESS</b>

Please send your <b>Sui token contract address</b>

<i>Example: 0xc1a35b6a9771e6eb69e3b36e921a3a373e6d33e6f863dab6949ed3c2d1228f73::neonet::NEONET</i>`;

export const tokenStep = async (ctx: Scenes.WizardContext<WizardState>) => {
if (
ctx.callbackQuery &&
"data" in ctx.callbackQuery &&
ctx.callbackQuery.data === "ready_to_boost"
) {
await ctx.answerCbQuery();
await ctx.reply(tokenMessage, { parse_mode: "HTML" });
return ctx.wizard.next();
}
};

================================================
FILE: src/steps/url-step.ts
================================================
import { Scenes } from "telegraf";
import { WizardState } from "../lib/types";
import { isValidSuiAddress } from "../lib/utils";
import { getBoostOrderByTokenAddress } from "../lib/db";

export const urlMessage = `✅ <b>TOKEN VERIFIED</b>

<i>Perfect! Your token address is valid</i>

📱 <b>TELEGRAM GROUP</b>

Please send your <b>Telegram group/channel link</b>
<i>Example: https://t.me/neonet_agent</i>`;

export const invalidTokenAddressMessage = `❌ <b>INVALID TOKEN ADDRESS</b>

<i>The address format doesn't match Sui network standards</i>

Please send a <b>valid Sui token address</b>
<i>Example: 0xc1a35b6a9771e6eb69e3b36e921a3a373e6d33e6f863dab6949ed3c2d1228f73::neonet::NEONET</i>`;

const boostedTokenMessage = (expirationDate: string) =>
`⛔️ <b>BOOST CURRENTLY ACTIVE</b>

<i>This token is already being boosted.</i>

You can place a new boost order after the current one expires. Or provide another token address.

🗓️ <b>Current Boost Expires:</b>
<code>${expirationDate}</code>`;

export const urlStep = async (ctx: Scenes.WizardContext<WizardState>) => {
if (ctx.message && "text" in ctx.message) {
const tokenAddress = ctx.message.text;

    if (!isValidSuiAddress(tokenAddress)) {
      await ctx.reply(invalidTokenAddressMessage, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      return;
    }

    const order = await getBoostOrderByTokenAddress(tokenAddress);

    console.log(order);

    if (order) {
      const expirationDate = new Date(order.boostEndsAt!).toLocaleString();

      await ctx.reply(boostedTokenMessage(expirationDate), {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });

      return;
    }

    ctx.scene.session.token = tokenAddress;

    await ctx.reply(urlMessage, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    return ctx.wizard.next();

}
};

================================================
FILE: src/steps/welcome-step.ts
================================================
import { Markup, Scenes } from "telegraf";
import { WizardState } from "../lib/types";

const welcomeKeyboard = Markup.inlineKeyboard([
Markup.button.callback("🚀 Start Boosting Now", "ready_to_boost"),
]);

export const welcomeMessage = `🚀 <b>SUI BOOST ACCELERATOR</b>

✨ <i>Premium Token Promotion on Sui Network</i> ✨

🎯 <b>Guaranteed Visibility</b>
Get your token boosted with our proven system

🔥 <b>Lightning Fast Setup</b>
From registration to boosting in under 10 minutes

💎 <b>Multiple Duration Options</b>
Choose from 4, 8, 12, 24 or 48-hour campaigns

⚡ <b>Flexible Pricing</b>
Affordable boost packages for every budget

<b>Ready to accelerate your token's success?</b>
Click below to begin your boosting journey!`;

export const welcomeStep = async (ctx: Scenes.WizardContext<WizardState>) => {
await ctx.reply(welcomeMessage, {
reply_markup: welcomeKeyboard.reply_markup,
parse_mode: "HTML",
});
return ctx.wizard.next();
};

================================================
FILE: .cursor/rules/development-guidelines.mdc
================================================

---

description:
globs:
alwaysApply: false

---

# Development Guidelines for Sui Telegram Ads Bot

## Project Understanding

- Always review the entire project structure to understand the codebase before making changes
- Familiarize yourself with the main entry point [index.ts](mdc:index.ts) and project configuration [package.json](mdc:package.json)
- Understand the database schema in [prisma/schema.prisma](mdc:prisma/schema.prisma)

## Code Changes Philosophy

- Keep changes simple, clear, and easy to understand
- Keep changes minimal and to the point
- Do not add comments in the code
- Respect the existing project structure and coding practices
- Ensure changes don't break the existing project functionality

## Investigation Approach

- Perform deep and thorough investigation to find the actual root cause of issues
- Do not assume prematurely — reason critically and evaluate alternatives
- Justify why your conclusion is truly the solution
- Continuously challenge and refine reasoning until you have a well-supported answer

## Development Practices

- Use PNPM as the package manager
- Keep implementations simple and straightforward
- Maintain consistency with existing code patterns in [src/](mdc:src) directory
- Follow the established structure for commands in [src/commands/](mdc:src/commands) and steps in [src/steps/](mdc:src/steps)

## Command Execution

- Do not run any commands at all strictly during discussion phases
- Focus on analysis and planning before implementation

================================================
FILE: .cursor/rules/project-structure.mdc
================================================

---

description:
globs:
alwaysApply: false

---

# Project Structure Guidelines

## Architecture Overview

This is a Sui blockchain Telegram bot for ads with the following structure:

### Core Files

- [index.ts](mdc:index.ts) - Main entry point
- [package.json](mdc:package.json) - Dependencies and scripts
- [tsconfig.json](mdc:tsconfig.json) - TypeScript configuration

### Database

- [prisma/schema.prisma](mdc:prisma/schema.prisma) - Database schema definition
- [src/lib/db.ts](mdc:src/lib/db.ts) - Database connection and utilities

### Bot Logic

- [src/commands/](mdc:src/commands) - Telegram bot commands (start, order, cancel)
- [src/steps/](mdc:src/steps) - Multi-step conversation flows
- [src/lib/](mdc:src/lib) - Shared utilities and constants

### Key Libraries

- [src/lib/sui.ts](mdc:src/lib/sui.ts) - Sui blockchain integration
- [src/lib/types.ts](mdc:src/lib/types.ts) - TypeScript type definitions
- [src/lib/utils.ts](mdc:src/lib/utils.ts) - Helper functions
- [src/lib/constants.ts](mdc:src/lib/constants.ts) - Application constants

## Development Guidelines

- Follow the existing step-based conversation pattern for new features
- Maintain separation between commands and multi-step flows
- Keep database operations in the lib directory
- Use TypeScript types consistently throughout the codebase

================================================
FILE: .cursor/rules/simple-changes.mdc
================================================

---

description:
globs:
alwaysApply: false

---

Keep your changes simple, clear and easy to understand. Keep your changes minimal and to the point. Do not add the comments in the code. Do not run any command at all strictly.

================================================
FILE: .github/workflows/docker-build.yml
================================================
name: Build and Push Docker Image

on:
push:
branches: ["main"]

jobs:
build-and-push:
runs-on: ubuntu-latest
steps: - name: Checkout code
uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/sui-tg-ads-bot:latest
