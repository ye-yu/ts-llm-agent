import * as module from "module";
import * as swc from "@swc/core";
import { fileURLToPath } from "url";

module.setSourceMapsSupport(true, { nodeModules: false });

module.registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (context.format !== "module-typescript") {
      return nextLoad(url, context);
    }
    const load = fileURLToPath(url);
    const transformed = swc.transformFileSync(load, {
      sourceMaps: "inline",
      jsc: {
        parser: {
          syntax: "typescript",
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    });

    if (!transformed.code.match(/_ts_metadata\(/)) {
      return nextLoad(url, context);
    }

    return { format: "module-typescript", source: transformed.code, shortCircuit: true };
  },
});
