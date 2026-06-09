// Display catalog of the MCP tools exposed by the aas-mcp-api Edge Function.
// Kept in sync manually with the edge function's TOOLS catalog (name, description,
// capability, args). Used to render the Tools tab (checkboxes + descriptions).

export type Capability = 'aas' | 'sm' | 'cd';

export interface McpToolInfo {
  name: string;
  description: string;
  capability: Capability;
  args: { name: string; required: boolean; description: string }[];
  upstream: string;
}

export const CAPABILITY_LABEL: Record<Capability, string> = {
  aas: 'AAS Repository',
  sm: 'Submodel Repository',
  cd: 'Concept Descriptions',
};

export const MCP_TOOLS: McpToolInfo[] = [
  {
    name: 'list_shells',
    description: 'List all Asset Administration Shells (paginated).',
    capability: 'aas',
    args: [
      { name: 'limit', required: false, description: 'Max number of items (optional)' },
      { name: 'cursor', required: false, description: 'Pagination cursor (optional)' },
    ],
    upstream: 'GET /shells',
  },
  {
    name: 'get_shell',
    description: 'Get an Asset Administration Shell by its identifier.',
    capability: 'aas',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}',
  },
  {
    name: 'get_asset_information',
    description: 'Get the asset information of an Asset Administration Shell.',
    capability: 'aas',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/asset-information',
  },
  {
    name: 'get_thumbnail',
    description: 'Get the thumbnail image of an Asset Administration Shell.',
    capability: 'aas',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/asset-information/thumbnail',
  },
  {
    name: 'get_submodel_refs',
    description: 'Get all submodel references of an Asset Administration Shell.',
    capability: 'aas',
    args: [{ name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' }],
    upstream: 'GET /shells/{aasIdentifier}/submodel-refs',
  },
  {
    name: 'get_submodel_of_shell',
    description: 'Get a specific submodel of an Asset Administration Shell.',
    capability: 'aas',
    args: [
      { name: 'aasIdentifier', required: true, description: 'Raw AAS identifier (IRI)' },
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
    ],
    upstream: 'GET /shells/{aasIdentifier}/submodels/{submodelIdentifier}',
  },
  {
    name: 'list_submodels',
    description: 'List all Submodels in the submodel repository (paginated).',
    capability: 'sm',
    args: [
      { name: 'limit', required: false, description: 'Max number of items (optional)' },
      { name: 'cursor', required: false, description: 'Pagination cursor (optional)' },
    ],
    upstream: 'GET /submodels',
  },
  {
    name: 'get_submodel',
    description: 'Get a submodel by its identifier from the submodel repository.',
    capability: 'sm',
    args: [{ name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' }],
    upstream: 'GET /submodels/{submodelIdentifier}',
  },
  {
    name: 'get_submodel_element',
    description: 'Get a submodel element by its idShort path within a submodel.',
    capability: 'sm',
    args: [
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
      { name: 'idShortPath', required: true, description: 'Dot-separated idShort path, e.g. Documentation.Manual' },
    ],
    upstream: 'GET /submodels/{submodelIdentifier}/submodel-elements/{idShortPath}',
  },
  {
    name: 'get_submodel_element_attachment',
    description: 'Get the file attachment of a submodel element (File / Blob).',
    capability: 'sm',
    args: [
      { name: 'submodelIdentifier', required: true, description: 'Raw submodel identifier (IRI)' },
      { name: 'idShortPath', required: true, description: 'Dot-separated idShort path to the File element' },
    ],
    upstream: 'GET /submodels/{submodelIdentifier}/submodel-elements/{idShortPath}/attachment',
  },
  {
    name: 'list_concept_descriptions',
    description: 'List all Concept Descriptions (paginated).',
    capability: 'cd',
    args: [
      { name: 'limit', required: false, description: 'Max number of items (optional)' },
      { name: 'cursor', required: false, description: 'Pagination cursor (optional)' },
    ],
    upstream: 'GET /concept-descriptions',
  },
  {
    name: 'get_concept_description',
    description: 'Get a Concept Description by its identifier.',
    capability: 'cd',
    args: [{ name: 'cdIdentifier', required: true, description: 'Raw Concept Description identifier (IRI)' }],
    upstream: 'GET /concept-descriptions/{cdIdentifier}',
  },
];

export const MCP_TOOL_MAP = new Map(MCP_TOOLS.map((t) => [t.name, t]));
