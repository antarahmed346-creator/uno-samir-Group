import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // WHAT: بيستثني السكريبتات المستقلة من قواعد الـ TypeScript الصارمة
    // WHY:  create-admin.js سكريبت Node.js بسيط يتشغل يدوي بره تطبيق
    //       Next.js، مش جزء من الكود اللي بيتبني ويترفع للمتصفح
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "create-admin.js"],
  },
];

export default eslintConfig;