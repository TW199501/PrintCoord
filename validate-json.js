const fs = require("fs");
const path = require("path");

const locales = ["en-US", "zh-TW", "zh-CN"];
const files = ["common.json", "templates.json"];

let hasError = false;

locales.forEach((locale) => {
  files.forEach((file) => {
    const filePath = path.join("src/i18n/messages", locale, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      JSON.parse(content);
      console.log(`${filePath}: OK`);
    } catch (e) {
      console.log(`${filePath}: ERROR - ${e.message}`);
      hasError = true;
    }
  });
});

if (!hasError) {
  console.log("All JSON files are valid!");
} else {
  console.log("Some JSON files have errors!");
}
