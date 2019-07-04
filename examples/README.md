# 📘 Examples

This folder consist of simple examples showing how to use different `type-arango` features and how to integrate them with ArangoDB Foxx or any other environment.

The examples assume a TypeScript setup. It is highly recommend to start with something like [arangodb-typescript-setup](https://github.com/RienNeVaPlus/arangodb-typescript-setup).

The examples have at least a folder for `shared` entities across all environments and a `main.ts` file or the ArangoDB Foxx Service.

> **Note**: The examples on master branch are designed to work with latest codebase that might not be released yet.
So if you are looking for examples that are compatible with the version you use, just browse the files by the git tag, e.g. [`tree/v0.3.0` for `0.3.0` release](https://github.com/RienNeVaPlus/type-arango/tree/v0.2.0/examples).

![divider](../assets/divider.png)

### Basics

- 🥑 [basic](./1-basic) - quick setup of defining an entity, a collection and some routes

![divider](../assets/divider.small.png)

### Advanced

- 👥 [roles](./2-roles) - usage of `roles` to authenticate `routes` and `attributes`

![divider](../assets/divider.png)

### 📜 tsconfig.json
It is recommended to use the folling `compilerOptions` when making use of the syntactic
 sugar argument function syntax (for example `roles => ['abc']`).


| compilerOption                | value     |
| ----------------------------- | --------- |
| noImplicitAny:                | **false** |
| strictPropertyInitialization: | **false** |
| noUnusedParameters:           | **false** |

*`Arguments` can be provided without the function syntax (`['abc']` instead of `roles => ['abc']`).*
