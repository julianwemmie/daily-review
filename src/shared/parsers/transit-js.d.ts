declare module "transit-js" {
  interface Reader {
    read(json: string): any;
  }

  interface Writer {
    write(obj: any): string;
  }

  function reader(type: "json" | "json-verbose"): Reader;
  function writer(type: "json" | "json-verbose"): Writer;

  export { reader, writer };
  export default { reader, writer };
}
