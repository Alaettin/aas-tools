// @ts-nocheck — aas-core3.1 constructors accept 0 args at runtime but TS types require them
import * as aas from '@aas-core-works/aas-core3.1-typescript';
import type {
  AssetAdministrationShell, Submodel, SubmodelElement, ConceptDescription,
  Reference, LangString, Qualifier, Extension, EmbeddedDataSpecification,
  SpecificAssetId, AssetInformation, AdministrativeInformation,
} from '../types';

// --- Enum Mappings ---

const DATA_TYPE_MAP: Record<string, aas.types.DataTypeDefXsd> = {
  'xs:anyURI': aas.types.DataTypeDefXsd.AnyUri,
  'xs:base64Binary': aas.types.DataTypeDefXsd.Base64Binary,
  'xs:boolean': aas.types.DataTypeDefXsd.Boolean,
  'xs:byte': aas.types.DataTypeDefXsd.Byte,
  'xs:date': aas.types.DataTypeDefXsd.Date,
  'xs:dateTime': aas.types.DataTypeDefXsd.DateTime,
  'xs:decimal': aas.types.DataTypeDefXsd.Decimal,
  'xs:double': aas.types.DataTypeDefXsd.Double,
  'xs:duration': aas.types.DataTypeDefXsd.Duration,
  'xs:float': aas.types.DataTypeDefXsd.Float,
  'xs:gDay': aas.types.DataTypeDefXsd.GDay,
  'xs:gMonth': aas.types.DataTypeDefXsd.GMonth,
  'xs:gMonthDay': aas.types.DataTypeDefXsd.GMonthDay,
  'xs:gYear': aas.types.DataTypeDefXsd.GYear,
  'xs:gYearMonth': aas.types.DataTypeDefXsd.GYearMonth,
  'xs:hexBinary': aas.types.DataTypeDefXsd.HexBinary,
  'xs:int': aas.types.DataTypeDefXsd.Int,
  'xs:integer': aas.types.DataTypeDefXsd.Integer,
  'xs:long': aas.types.DataTypeDefXsd.Long,
  'xs:negativeInteger': aas.types.DataTypeDefXsd.NegativeInteger,
  'xs:nonNegativeInteger': aas.types.DataTypeDefXsd.NonNegativeInteger,
  'xs:nonPositiveInteger': aas.types.DataTypeDefXsd.NonPositiveInteger,
  'xs:positiveInteger': aas.types.DataTypeDefXsd.PositiveInteger,
  'xs:short': aas.types.DataTypeDefXsd.Short,
  'xs:string': aas.types.DataTypeDefXsd.String,
  'xs:time': aas.types.DataTypeDefXsd.Time,
  'xs:unsignedByte': aas.types.DataTypeDefXsd.UnsignedByte,
  'xs:unsignedInt': aas.types.DataTypeDefXsd.UnsignedInt,
  'xs:unsignedLong': aas.types.DataTypeDefXsd.UnsignedLong,
  'xs:unsignedShort': aas.types.DataTypeDefXsd.UnsignedShort,
};

const REFERENCE_TYPE_MAP: Record<string, aas.types.ReferenceTypes> = {
  ExternalReference: aas.types.ReferenceTypes.ExternalReference,
  ModelReference: aas.types.ReferenceTypes.ModelReference,
};

const KEY_TYPE_MAP: Record<string, aas.types.KeyTypes> = {
  Submodel: aas.types.KeyTypes.Submodel,
  SubmodelElement: aas.types.KeyTypes.SubmodelElement,
  Property: aas.types.KeyTypes.Property,
  MultiLanguageProperty: aas.types.KeyTypes.MultiLanguageProperty,
  Range: aas.types.KeyTypes.Range,
  Blob: aas.types.KeyTypes.Blob,
  File: aas.types.KeyTypes.File,
  ReferenceElement: aas.types.KeyTypes.ReferenceElement,
  SubmodelElementCollection: aas.types.KeyTypes.SubmodelElementCollection,
  SubmodelElementList: aas.types.KeyTypes.SubmodelElementList,
  Entity: aas.types.KeyTypes.Entity,
  BasicEventElement: aas.types.KeyTypes.BasicEventElement,
  Operation: aas.types.KeyTypes.Operation,
  Capability: aas.types.KeyTypes.Capability,
  RelationshipElement: aas.types.KeyTypes.RelationshipElement,
  AnnotatedRelationshipElement: aas.types.KeyTypes.AnnotatedRelationshipElement,
  GlobalReference: aas.types.KeyTypes.GlobalReference,
  AssetAdministrationShell: aas.types.KeyTypes.AssetAdministrationShell,
};

const ENTITY_TYPE_MAP: Record<string, aas.types.EntityType> = {
  SelfManagedEntity: aas.types.EntityType.SelfManagedEntity,
  CoManagedEntity: aas.types.EntityType.CoManagedEntity,
};

const DIRECTION_MAP: Record<string, aas.types.Direction> = {
  input: aas.types.Direction.Input,
  output: aas.types.Direction.Output,
};

const STATE_MAP: Record<string, aas.types.StateOfEvent> = {
  on: aas.types.StateOfEvent.On,
  off: aas.types.StateOfEvent.Off,
};

const QUALIFIER_KIND_MAP: Record<string, aas.types.QualifierKind> = {
  ConceptQualifier: aas.types.QualifierKind.ConceptQualifier,
  ValueQualifier: aas.types.QualifierKind.ValueQualifier,
  TemplateQualifier: aas.types.QualifierKind.TemplateQualifier,
};

const SME_LIST_TYPE_MAP: Record<string, aas.types.AasSubmodelElements> = {
  SubmodelElement: aas.types.AasSubmodelElements.SubmodelElement,
  Property: aas.types.AasSubmodelElements.Property,
  MultiLanguageProperty: aas.types.AasSubmodelElements.MultiLanguageProperty,
  Range: aas.types.AasSubmodelElements.Range,
  Blob: aas.types.AasSubmodelElements.Blob,
  File: aas.types.AasSubmodelElements.File,
  ReferenceElement: aas.types.AasSubmodelElements.ReferenceElement,
  SubmodelElementCollection: aas.types.AasSubmodelElements.SubmodelElementCollection,
  SubmodelElementList: aas.types.AasSubmodelElements.SubmodelElementList,
  Entity: aas.types.AasSubmodelElements.Entity,
  BasicEventElement: aas.types.AasSubmodelElements.BasicEventElement,
  Operation: aas.types.AasSubmodelElements.Operation,
  Capability: aas.types.AasSubmodelElements.Capability,
  RelationshipElement: aas.types.AasSubmodelElements.RelationshipElement,
};

// --- Converters ---

function convertLangStrings(ls: LangString[]): aas.types.LangStringTextType[] {
  return ls.map(l => { const r = new aas.types.LangStringTextType(l.language, l.text); return r; });
}

function convertLangStringNames(ls: LangString[]): aas.types.LangStringNameType[] {
  return ls.map(l => { const r = new aas.types.LangStringNameType(l.language, l.text); return r; });
}

function convertReference(ref: Reference): aas.types.Reference {
  const keys = ref.keys.map(k => { const r = new aas.types.Key(KEY_TYPE_MAP[k.type] ?? aas.types.KeyTypes.GlobalReference, k.value); return r; });
  return new aas.types.Reference(REFERENCE_TYPE_MAP[ref.type] ?? aas.types.ReferenceTypes.ExternalReference, keys);
}

function convertQualifiers(qualifiers: Qualifier[]): aas.types.Qualifier[] {
  return qualifiers.map(q => {
    const qualifier = new aas.types.Qualifier(q.type, DATA_TYPE_MAP[q.valueType] ?? aas.types.DataTypeDefXsd.String);
    if (q.kind) qualifier.kind = QUALIFIER_KIND_MAP[q.kind];
    if (q.value) qualifier.value = q.value;
    if (q.valueId) qualifier.valueId = convertReference(q.valueId);
    if (q.semanticId) qualifier.semanticId = convertReference(q.semanticId);
    if (q.supplementalSemanticIds && q.supplementalSemanticIds.length > 0) {
      qualifier.supplementalSemanticIds = q.supplementalSemanticIds.map(convertReference);
    }
    return qualifier;
  });
}

function convertExtensions(extensions: Extension[]): aas.types.Extension[] {
  return extensions.map(ext => {
    const e = new aas.types.Extension(ext.name);
    if (ext.valueType) e.valueType = DATA_TYPE_MAP[ext.valueType];
    if (ext.value) e.value = ext.value;
    if (ext.semanticId) e.semanticId = convertReference(ext.semanticId);
    if (ext.supplementalSemanticIds && ext.supplementalSemanticIds.length > 0) {
      e.supplementalSemanticIds = ext.supplementalSemanticIds.map(convertReference);
    }
    return e;
  });
}

function convertEmbeddedDataSpecs(specs: EmbeddedDataSpecification[]): aas.types.EmbeddedDataSpecification[] {
  return specs.map(spec => {
    const content = new aas.types.DataSpecificationIec61360(
      spec.dataSpecificationContent.preferredName.map(l => new aas.types.LangStringPreferredNameTypeIec61360(l.language, l.text)),
    );
    if (spec.dataSpecificationContent.shortName) {
      content.shortName = spec.dataSpecificationContent.shortName.map(l => new aas.types.LangStringShortNameTypeIec61360(l.language, l.text));
    }
    if (spec.dataSpecificationContent.unit) content.unit = spec.dataSpecificationContent.unit;
    if (spec.dataSpecificationContent.dataType) content.dataType = spec.dataSpecificationContent.dataType as unknown as aas.types.DataTypeIec61360;
    if (spec.dataSpecificationContent.definition) {
      content.definition = spec.dataSpecificationContent.definition.map(l => new aas.types.LangStringDefinitionTypeIec61360(l.language, l.text));
    }
    if (spec.dataSpecificationContent.value) content.value = spec.dataSpecificationContent.value;

    return new aas.types.EmbeddedDataSpecification(convertReference(spec.dataSpecification), content);
  });
}

function convertAdministration(admin: AdministrativeInformation): aas.types.AdministrativeInformation {
  const result = new aas.types.AdministrativeInformation();
  if (admin.version) result.version = admin.version;
  if (admin.revision) result.revision = admin.revision;
  if (admin.creator) result.creator = convertReference(admin.creator);
  if (admin.templateId) result.templateId = admin.templateId;
  if (admin.embeddedDataSpecifications) result.embeddedDataSpecifications = convertEmbeddedDataSpecs(admin.embeddedDataSpecifications);
  return result;
}

function convertSpecificAssetIds(ids: SpecificAssetId[]): aas.types.SpecificAssetId[] {
  return ids.map(sa => {
    const result = new aas.types.SpecificAssetId(sa.name, sa.value);
    if (sa.externalSubjectId) result.externalSubjectId = convertReference(sa.externalSubjectId);
    if (sa.semanticId) result.semanticId = convertReference(sa.semanticId);
    return result;
  });
}

function convertAssetInformation(ai: AssetInformation): aas.types.AssetInformation {
  const kind = ai.assetKind === 'Type' ? aas.types.AssetKind.Type : aas.types.AssetKind.Instance;
  const result = new aas.types.AssetInformation(kind);
  if (ai.globalAssetId) result.globalAssetId = ai.globalAssetId;
  if (ai.assetType) result.assetType = ai.assetType;
  if (ai.specificAssetIds) result.specificAssetIds = convertSpecificAssetIds(ai.specificAssetIds);
  return result;
}

function applyCommonFields(target: aas.types.ISubmodelElement, el: SubmodelElement) {
  target.idShort = el.idShort;
  if (el.category) target.category = el.category;
  if (el.semanticId) target.semanticId = convertReference(el.semanticId);
  if (el.supplementalSemanticIds && el.supplementalSemanticIds.length > 0) {
    target.supplementalSemanticIds = el.supplementalSemanticIds.map(convertReference);
  }
  if (el.description) target.description = convertLangStrings(el.description);
  if (el.displayName) target.displayName = convertLangStringNames(el.displayName);
  if (el.qualifiers) target.qualifiers = convertQualifiers(el.qualifiers);
  if (el.extensions) target.extensions = convertExtensions(el.extensions);
  if (el.embeddedDataSpecifications) target.embeddedDataSpecifications = convertEmbeddedDataSpecs(el.embeddedDataSpecifications);
}

export function convertSubmodelElement(el: SubmodelElement): aas.types.ISubmodelElement {
  switch (el.modelType) {
    case 'Property': {
      const p = new aas.types.Property(DATA_TYPE_MAP[el.valueType] ?? aas.types.DataTypeDefXsd.String);
      applyCommonFields(p, el);
      if (el.value) p.value = el.value;
      if (el.valueId) p.valueId = convertReference(el.valueId);
      return p;
    }
    case 'MultiLanguageProperty': {
      const mlp = new aas.types.MultiLanguageProperty();
      applyCommonFields(mlp, el);
      if (el.value && el.value.length > 0) mlp.value = el.value.map(l => new aas.types.LangStringTextType(l.language, l.text));
      return mlp;
    }
    case 'Range': {
      const r = new aas.types.Range(DATA_TYPE_MAP[el.valueType] ?? aas.types.DataTypeDefXsd.Double);
      applyCommonFields(r, el);
      if (el.min) r.min = el.min;
      if (el.max) r.max = el.max;
      return r;
    }
    case 'File': {
      const f = new aas.types.File();
      f.contentType = el.contentType;
      applyCommonFields(f, el);
      if (el.value) f.value = el.value;
      return f;
    }
    case 'Blob': {
      const b = new aas.types.Blob();
      b.contentType = el.contentType;
      applyCommonFields(b, el);
      return b;
    }
    case 'ReferenceElement': {
      const re = new aas.types.ReferenceElement();
      applyCommonFields(re, el);
      if (el.value) re.value = convertReference(el.value);
      return re;
    }
    case 'SubmodelElementCollection': {
      const smc = new aas.types.SubmodelElementCollection();
      applyCommonFields(smc, el);
      if (el.value && el.value.length > 0) smc.value = el.value.map(convertSubmodelElement);
      return smc;
    }
    case 'SubmodelElementList': {
      const sml = new aas.types.SubmodelElementList(SME_LIST_TYPE_MAP[el.typeValueListElement] ?? aas.types.AasSubmodelElements.SubmodelElement);
      applyCommonFields(sml, el);
      if (el.value && el.value.length > 0) sml.value = el.value.map(convertSubmodelElement);
      if (el.valueTypeListElement) sml.valueTypeListElement = DATA_TYPE_MAP[el.valueTypeListElement];
      if (el.semanticIdListElement) sml.semanticIdListElement = convertReference(el.semanticIdListElement);
      if (el.orderRelevant !== undefined) sml.orderRelevant = el.orderRelevant;
      return sml;
    }
    case 'Entity': {
      const ent = new aas.types.Entity();
      ent.entityType = ENTITY_TYPE_MAP[el.entityType] ?? aas.types.EntityType.SelfManagedEntity;
      applyCommonFields(ent, el);
      if (el.globalAssetId) ent.globalAssetId = el.globalAssetId;
      if (el.specificAssetIds) ent.specificAssetIds = convertSpecificAssetIds(el.specificAssetIds);
      if (el.statements && el.statements.length > 0) ent.statements = el.statements.map(convertSubmodelElement);
      return ent;
    }
    case 'RelationshipElement': {
      const rel = new aas.types.RelationshipElement();
      rel.first = convertReference(el.first);
      rel.second = convertReference(el.second);
      applyCommonFields(rel, el);
      return rel;
    }
    case 'AnnotatedRelationshipElement': {
      const arel = new aas.types.AnnotatedRelationshipElement();
      arel.first = convertReference(el.first);
      arel.second = convertReference(el.second);
      applyCommonFields(arel, el);
      if (el.annotations && el.annotations.length > 0) arel.annotations = el.annotations.map(convertSubmodelElement) as aas.types.IDataElement[];
      return arel;
    }
    case 'BasicEventElement': {
      const evt = new aas.types.BasicEventElement();
      evt.observed = convertReference(el.observed);
      evt.direction = DIRECTION_MAP[el.direction] ?? aas.types.Direction.Output;
      evt.state = STATE_MAP[el.state] ?? aas.types.StateOfEvent.On;
      applyCommonFields(evt, el);
      if (el.messageTopic) evt.messageTopic = el.messageTopic;
      if (el.messageBroker) evt.messageBroker = convertReference(el.messageBroker);
      return evt;
    }
    case 'Operation': {
      const op = new aas.types.Operation();
      applyCommonFields(op, el);
      return op;
    }
    case 'Capability': {
      const cap = new aas.types.Capability();
      applyCommonFields(cap, el);
      return cap;
    }
    default: {
      const fallback = new aas.types.Property();
      fallback.valueType = aas.types.DataTypeDefXsd.String;
      fallback.idShort = el.idShort;
      return fallback;
    }
  }
}

export function convertSubmodel(sm: Submodel): aas.types.Submodel {
  const result = new aas.types.Submodel(sm.id);
  if (sm.idShort) result.idShort = sm.idShort;
  if (sm.category) result.category = sm.category;
  if (sm.semanticId) result.semanticId = convertReference(sm.semanticId);
  if (sm.supplementalSemanticIds && sm.supplementalSemanticIds.length > 0) {
    result.supplementalSemanticIds = sm.supplementalSemanticIds.map(convertReference);
  }
  if (sm.submodelElements && sm.submodelElements.length > 0) {
    result.submodelElements = sm.submodelElements.map(convertSubmodelElement);
  }
  if (sm.description) result.description = convertLangStrings(sm.description);
  if (sm.displayName) result.displayName = convertLangStringNames(sm.displayName);
  if (sm.administration) result.administration = convertAdministration(sm.administration);
  if (sm.qualifiers) result.qualifiers = convertQualifiers(sm.qualifiers);
  if (sm.extensions) result.extensions = convertExtensions(sm.extensions);
  if (sm.embeddedDataSpecifications) result.embeddedDataSpecifications = convertEmbeddedDataSpecs(sm.embeddedDataSpecifications);
  if (sm.kind) result.kind = sm.kind === 'Template' ? aas.types.ModellingKind.Template : aas.types.ModellingKind.Instance;
  return result;
}

export function convertShell(shell: AssetAdministrationShell): aas.types.AssetAdministrationShell {
  const ai = convertAssetInformation(shell.assetInformation);
  const result = new aas.types.AssetAdministrationShell(shell.id, ai);
  if (shell.idShort) result.idShort = shell.idShort;
  if (shell.category) result.category = shell.category;
  if (shell.submodels && shell.submodels.length > 0) {
    result.submodels = shell.submodels.map(convertReference);
  }
  if (shell.description) result.description = convertLangStrings(shell.description);
  if (shell.displayName) result.displayName = convertLangStringNames(shell.displayName);
  if (shell.administration) result.administration = convertAdministration(shell.administration);
  if (shell.derivedFrom) result.derivedFrom = convertReference(shell.derivedFrom);
  if (shell.extensions) result.extensions = convertExtensions(shell.extensions);
  if (shell.embeddedDataSpecifications) result.embeddedDataSpecifications = convertEmbeddedDataSpecs(shell.embeddedDataSpecifications);
  return result;
}

export function convertConceptDescription(cd: ConceptDescription): aas.types.ConceptDescription {
  const result = new aas.types.ConceptDescription(cd.id);
  if (cd.idShort) result.idShort = cd.idShort;
  if (cd.category) result.category = cd.category;
  if (cd.isCaseOf) result.isCaseOf = cd.isCaseOf.map(convertReference);
  if (cd.description) result.description = convertLangStrings(cd.description);
  if (cd.displayName) result.displayName = convertLangStringNames(cd.displayName);
  if (cd.administration) result.administration = convertAdministration(cd.administration);
  if (cd.extensions) result.extensions = convertExtensions(cd.extensions);
  if (cd.embeddedDataSpecifications) result.embeddedDataSpecifications = convertEmbeddedDataSpecs(cd.embeddedDataSpecifications);
  return result;
}
