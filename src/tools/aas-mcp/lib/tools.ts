// Mirror of the 8 MCP tools exposed by the aas-mcp-api Edge Function.
// Kept in sync manually for display in the UI (Tools tab + API docs).

export interface McpToolInfo {
  name: string;
  description: string;
  args: { name: string; required: boolean; description: string }[];
  upstream: string;
}

export const MCP_TOOLS: McpToolInfo[] = [
  {
    name: 'get_shell',
    description: 'Get an Asset Administration Shell by its identifier.',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}',
  },
  {
    name: 'get_asset_information',
    description: 'Get the asset information of an Asset Administration Shell.',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/asset-information',
  },
  {
    name: 'get_thumbnail',
    description: 'Get the thumbnail image of an Asset Administration Shell.',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/asset-information/thumbnail',
  },
  {
    name: 'get_submodel_refs',
    description: 'Get all submodel references of an Asset Administration Shell.',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/submodel-refs',
  },
  {
    name: 'get_submodel_of_shell',
    description: 'Get a specific submodel of an Asset Administration Shell.',
    args: [
      { name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' },
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
    ],
    upstream: 'GET /shells/{aasIdentifier}/submodels/{submodelIdentifier}',
  },
  {
    name: 'get_submodel',
    description: 'Get a submodel by its identifier from the submodel repository.',
    args: [{ name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' }],
    upstream: 'GET /submodels/{submodelIdentifier}',
  },
  {
    name: 'get_submodel_element',
    description: 'Get a submodel element by its idShort path within a submodel.',
    args: [
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
      { name: 'idShortPath', required: true, description: 'Dot-separated idShort path, e.g. Documentation.Manual' },
    ],
    upstream: 'GET /submodels/{submodelIdentifier}/submodel-elements/{idShortPath}',
  },
  {
    name: 'get_submodel_element_attachment',
    description: 'Get the file attachment of a submodel element (File / Blob).',
    args: [
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
      { name: 'idShortPath', required: true, description: 'Dot-separated idShort path to the File element' },
    ],
    upstream: 'GET /submodels/{submodelIdentifier}/submodel-elements/{idShortPath}/attachment',
  },
];
