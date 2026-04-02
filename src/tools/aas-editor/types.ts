// AAS Part 1 Metamodel Types (V3.1)
// Copied from aas-editor project

export interface AasProject {
  id: string;
  user_id: string;
  name: string;
  canvas_data: {
    nodes: unknown[];
    edges: unknown[];
  };
  created_at: string;
  updated_at: string;
}

// --- Enums ---

export enum AssetKind {
  Type = 'Type',
  Instance = 'Instance',
}

export enum ModellingKind {
  Template = 'Template',
  Instance = 'Instance',
}

export enum ReferenceTypes {
  ExternalReference = 'ExternalReference',
  ModelReference = 'ModelReference',
}

export enum EntityType {
  SelfManagedEntity = 'SelfManagedEntity',
  CoManagedEntity = 'CoManagedEntity',
}

export enum Direction {
  Input = 'input',
  Output = 'output',
}

export enum StateOfEvent {
  On = 'on',
  Off = 'off',
}

export enum QualifierKind {
  ConceptQualifier = 'ConceptQualifier',
  ValueQualifier = 'ValueQualifier',
  TemplateQualifier = 'TemplateQualifier',
}

export enum DataTypeDefXsd {
  AnyURI = 'xs:anyURI',
  Base64Binary = 'xs:base64Binary',
  Boolean = 'xs:boolean',
  Byte = 'xs:byte',
  Date = 'xs:date',
  DateTime = 'xs:dateTime',
  Decimal = 'xs:decimal',
  Double = 'xs:double',
  Duration = 'xs:duration',
  Float = 'xs:float',
  GDay = 'xs:gDay',
  GMonth = 'xs:gMonth',
  GMonthDay = 'xs:gMonthDay',
  GYear = 'xs:gYear',
  GYearMonth = 'xs:gYearMonth',
  HexBinary = 'xs:hexBinary',
  Int = 'xs:int',
  Integer = 'xs:integer',
  Long = 'xs:long',
  NegativeInteger = 'xs:negativeInteger',
  NonNegativeInteger = 'xs:nonNegativeInteger',
  NonPositiveInteger = 'xs:nonPositiveInteger',
  PositiveInteger = 'xs:positiveInteger',
  Short = 'xs:short',
  String = 'xs:string',
  Time = 'xs:time',
  UnsignedByte = 'xs:unsignedByte',
  UnsignedInt = 'xs:unsignedInt',
  UnsignedLong = 'xs:unsignedLong',
  UnsignedShort = 'xs:unsignedShort',
}

// --- Primitive Types ---

export interface LangString {
  language: string;
  text: string;
}

export interface Key {
  type: string;
  value: string;
}

export interface Reference {
  type: ReferenceTypes;
  keys: Key[];
  referredSemanticId?: Reference;
}

export interface AdministrativeInformation {
  version?: string;
  revision?: string;
  creator?: Reference;
  templateId?: string;
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

export interface Qualifier {
  kind?: QualifierKind;
  type: string;
  valueType: DataTypeDefXsd;
  value?: string;
  valueId?: Reference;
  semanticId?: Reference;
  supplementalSemanticIds?: Reference[];
}

export interface Extension {
  name: string;
  valueType?: DataTypeDefXsd;
  value?: string;
  semanticId?: Reference;
  supplementalSemanticIds?: Reference[];
  refersTo?: Reference[];
}

// --- Core Classes ---

export interface Resource {
  path: string;
  contentType?: string;
}

export interface SpecificAssetId {
  name: string;
  value: string;
  externalSubjectId?: Reference;
  semanticId?: Reference;
}

export interface AssetInformation {
  assetKind: AssetKind;
  globalAssetId?: string;
  specificAssetIds?: SpecificAssetId[];
  assetType?: string;
  defaultThumbnail?: Resource;
}

export interface AssetAdministrationShell {
  id: string;
  idShort?: string;
  category?: string;
  assetInformation: AssetInformation;
  submodels?: Reference[];
  derivedFrom?: Reference;
  administration?: AdministrativeInformation;
  description?: LangString[];
  displayName?: LangString[];
  extensions?: Extension[];
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

export interface Submodel {
  id: string;
  idShort?: string;
  category?: string;
  kind?: ModellingKind;
  semanticId?: Reference;
  supplementalSemanticIds?: Reference[];
  submodelElements?: SubmodelElement[];
  qualifiers?: Qualifier[];
  administration?: AdministrativeInformation;
  description?: LangString[];
  displayName?: LangString[];
  extensions?: Extension[];
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

// --- SubmodelElement Types ---

interface SubmodelElementBase {
  idShort: string;
  _nodeId?: string;
  category?: string;
  semanticId?: Reference;
  supplementalSemanticIds?: Reference[];
  qualifiers?: Qualifier[];
  description?: LangString[];
  displayName?: LangString[];
  extensions?: Extension[];
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

export interface Property extends SubmodelElementBase {
  modelType: 'Property';
  valueType: DataTypeDefXsd;
  value?: string;
  valueId?: Reference;
}

export interface MultiLanguageProperty extends SubmodelElementBase {
  modelType: 'MultiLanguageProperty';
  value?: LangString[];
  valueId?: Reference;
}

export interface Range extends SubmodelElementBase {
  modelType: 'Range';
  valueType: DataTypeDefXsd;
  min?: string;
  max?: string;
}

export interface Blob extends SubmodelElementBase {
  modelType: 'Blob';
  value?: string;
  contentType: string;
}

export interface AasFile extends SubmodelElementBase {
  modelType: 'File';
  value?: string;
  contentType: string;
}

export interface ReferenceElement extends SubmodelElementBase {
  modelType: 'ReferenceElement';
  value?: Reference;
}

export interface SubmodelElementCollection extends SubmodelElementBase {
  modelType: 'SubmodelElementCollection';
  value?: SubmodelElement[];
}

export interface SubmodelElementList extends SubmodelElementBase {
  modelType: 'SubmodelElementList';
  orderRelevant?: boolean;
  value?: SubmodelElement[];
  semanticIdListElement?: Reference;
  typeValueListElement: string;
  valueTypeListElement?: DataTypeDefXsd;
}

export interface Entity extends SubmodelElementBase {
  modelType: 'Entity';
  statements?: SubmodelElement[];
  entityType: EntityType;
  globalAssetId?: string;
  specificAssetIds?: SpecificAssetId[];
}

export interface RelationshipElement extends SubmodelElementBase {
  modelType: 'RelationshipElement';
  first: Reference;
  second: Reference;
}

export interface AnnotatedRelationshipElement extends SubmodelElementBase {
  modelType: 'AnnotatedRelationshipElement';
  first: Reference;
  second: Reference;
  annotations?: SubmodelElement[];
}

export interface Operation extends SubmodelElementBase {
  modelType: 'Operation';
  inputVariables?: OperationVariable[];
  outputVariables?: OperationVariable[];
  inoutputVariables?: OperationVariable[];
}

export interface OperationVariable {
  value: SubmodelElement;
}

export interface Capability extends SubmodelElementBase {
  modelType: 'Capability';
}

export interface BasicEventElement extends SubmodelElementBase {
  modelType: 'BasicEventElement';
  observed: Reference;
  direction: Direction;
  state: StateOfEvent;
  messageTopic?: string;
  messageBroker?: Reference;
  lastUpdate?: string;
  minInterval?: string;
  maxInterval?: string;
}

export type SubmodelElement =
  | Property
  | MultiLanguageProperty
  | Range
  | Blob
  | AasFile
  | ReferenceElement
  | SubmodelElementCollection
  | SubmodelElementList
  | Entity
  | RelationshipElement
  | AnnotatedRelationshipElement
  | Operation
  | Capability
  | BasicEventElement;

// --- ConceptDescription ---

export interface EmbeddedDataSpecification {
  dataSpecification: Reference;
  dataSpecificationContent: DataSpecificationIec61360;
}

export interface DataSpecificationIec61360 {
  preferredName: LangString[];
  shortName?: LangString[];
  unit?: string;
  unitId?: Reference;
  sourceOfDefinition?: string;
  symbol?: string;
  dataType?: string;
  definition?: LangString[];
  valueFormat?: string;
  valueList?: { valueReferencePairs: { value: string; valueId: Reference }[] };
  value?: string;
  levelType?: { min: boolean; nom: boolean; typ: boolean; max: boolean };
}

export interface ConceptDescription {
  id: string;
  idShort?: string;
  category?: string;
  isCaseOf?: Reference[];
  administration?: AdministrativeInformation;
  description?: LangString[];
  displayName?: LangString[];
  extensions?: Extension[];
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

export interface AasEnvironment {
  assetAdministrationShells: AssetAdministrationShell[];
  submodels: Submodel[];
  conceptDescriptions: ConceptDescription[];
}
