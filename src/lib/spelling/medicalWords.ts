// Words a radiology report uses that an everyday English dictionary does not
// know. Added to the spelling check on top of British English, so these are
// never underlined and are offered as suggestions for near misses.
//
// Abbreviations in capitals (VUJ, PUJ, CBD, HRCT) and words with digits
// (T2W, C5-C6) are never checked, so they are not listed here. American
// spellings of common terms are listed too, as both are seen in reports.

const WORDS = `
abdomen abdomens abdominal abdominopelvic abducens aberrant ablation abscess abscesses acalculous accessory acetabular
acetabulum achalasia acinar acoustic acromial acromioclavicular acromion adenitis adenocarcinoma adenoid adenoids adenoma
adenomas adenomatous adenomyosis adenopathy adhesions adnexa adnexal adrenal adrenals aerated aeration agenesis
alveolar alveoli amorphous ampulla ampullary amyloid amyloidosis anastomosis anastomotic anechoic aneurysm aneurysmal
aneurysms angiogram angiography angiomyolipoma angulation ankylosing annular annulus anomalous anterolateral
anteromedial anteroposterior anteverted anteversion antral antrum aorta aortic aortobifemoral aortocaval aortogram apical
apices apophyseal apophysis appendiceal appendicitis appendicolith appendix arachnoid arcuate areolar arteriogram
arteriovenous arthritic arthritis arthrogram arthropathy arthroplasty articular aryepiglottic arytenoid ascites ascitic
aspergilloma astrocytoma asymmetrical atelectasis atelectatic atheroma atheromatous atherosclerosis atherosclerotic
atlantoaxial atlanto atresia atrial atrophic atrophy attenuating attenuation atypical auricular avascular avulsion axilla
axillae axillary azygos azygous
basal basilar basivertebral benign biconvex bifid bifurcation biliary bilobed biloma bladder blastic bosselated brachial
brachiocephalic bronchi bronchial bronchiectasis bronchiectatic bronchiolar bronchioles bronchiolitis bronchogenic
bronchogram bronchograms bronchopneumonia bronchopulmonary bronchovascular bronchus bulky bulla bullae bullous bursa
bursae bursal bursitis
caecal caecum calcaneal calcaneum calcaneus calcific calcification calcifications calcified calculi calculous calculus
calyceal calyces calyx canalicular capsular capsulitis carcinoid carcinoma carcinomas carcinomatosis cardiomegaly
cardiophrenic carina carinal carotid carpal carpus cartilaginous caudal caudate cavernosa cavernous cavitating cavitation
cavitary cecal cecum cephalad cephalic cerebellar cerebellopontine cerebellum cerebral cerebri cerebrospinal cervical
chiasm chiasma chiasmatic cholangiocarcinoma cholangiogram cholangiography cholangitis cholecystectomy cholecystitis
choledochal choledocholithiasis cholelithiasis cholesteatoma chondral chondrocalcinosis chondroma chondromalacia
chondrosarcoma choroid choroidal cingulate circumflex cirrhosis cirrhotic cisterna cisternal cisterns claustrum clavicle
clavicular clinoid clivus coarctation coccygeal coccyx cochlea cochlear coeliac colic colitis collateral collaterals
collecting colonic colorectal comminuted comminution concha conchae condylar condyle condyles confluent consolidation
consolidations consolidative contralateral contusion contusions conus cornual coronal coronoid corpora corpus cortical
corticated corticomedullary costal costochondral costophrenic cranial craniocaudal craniovertebral cribriform cricoid
cruciate crura crural crus cuboid cuneiform cyst cystic cystitis cystocele cysts
dacryocystitis decompression decubitus degenerative dehiscence deltoid demyelinating demyelination densities dentate
dependent dermoid desmoplastic diaphragm diaphragmatic diaphyseal diaphysis diastasis diffusely dilatation dilated diploic
disc discal discitis discogenic discs dislocation dissecting dissection distal distension distended diverticula
diverticular diverticulitis diverticulosis diverticulum dolichoectasia dorsal dorsum duodenal duodenum dural dysplasia
dysplastic
echogenic echogenicity echoes echotexture ectasia ectatic ectopic effaced effacement effusion effusions embolism
emboli embolus emphysema emphysematous empyema encephalitis encephalomalacia encephalopathy enchondroma endobronchial
endometrial endometrioma endometriosis endometrium endoscopic endplate endplates enhancing enlargement enteric enteritis
enterocolitis ependymoma epicardial epicondylar epicondyle epididymal epididymis epididymitis epidural epigastric
epigastrium epiglottis epiphyseal epiphysis episcleral erosion erosions erosive esophageal esophagitis esophagus
ethmoid ethmoidal eventration exophytic exostosis extra extracapsular extraconal extradural extrahepatic extramedullary
extraocular extrarenal exudate exudative
facet facetal facets falcine falx fascia fasciae fascial fasciitis fatty femoral femoris femur fibroadenoma fibroid
fibroids fibrosis fibrotic fibula fibular fissural fissure fissures fistula fistulae fistulas fluid focal foramen foramina
foraminal fossa fossae fovea frontal frontoparietal fundal fundus fusiform
gadolinium gallbladder gallstone gallstones ganglion ganglia ganglioglioma gastrectomy gastric gastritis gastrocnemius
gastroduodenal gastroesophageal gastrointestinal gastrooesophageal genu glenohumeral glenoid glioblastoma glioma gliomas
gliosis gliotic globe glomerular glottic glottis gluteal gluteus granuloma granulomas granulomatous gravid gyri gyral
gyrus
haemangioma haemangiomas haematoma haematomas haematuria haemoperitoneum haemorrhage haemorrhages haemorrhagic
haemothorax hamartoma hamate hamstring haustral haustrations hemangioma hemangiomas hematoma hematomas hematuria
hemidiaphragm hemidiaphragms hemithorax hemorrhage hemorrhagic hemothorax hepatic hepatitis hepatobiliary hepatocellular
hepatoduodenal hepatomegaly hepatorenal hepatosplenomegaly hernia herniae herniated herniation hiatal hiatus hila hilar
hilum hippocampal hippocampus homogeneous homogeneously humeral humerus hydatid hydrocele hydrocephalus hydronephrosis
hydrosalpinx hydroureter hydroureteronephrosis hyoid hyperaemia hyperdense hyperechoic hyperemia hyperinflated
hyperinflation hyperintense hyperintensities hyperintensity hyperlucent hyperostosis hyperplasia hyperplastic
hypertrophic hypertrophy hypoattenuating hypodense hypodensity hypoechoic hypogastric hypoglossal hypointense
hypointensity hypopharynx hypophysis hypoplasia hypoplastic hypothalamic hypothalamus hysterectomy
ileal ileitis ileocaecal ileocecal ileum iliac iliopsoas ilium impacted impingement infarct infarction infarcts
inferolateral inferomedial infiltrate infiltrates infiltrative inflammatory infraclavicular infracolic infrahilar
infrarenal infraspinatus infratentorial inguinal innominate insula insular interatrial intercostal interhemispheric
interlobar interlobular intermuscular interosseous interphalangeal interstitial interstitium intertrochanteric
interventricular intervertebral intima intimal intraabdominal intraaxial intracanalicular intracapsular intracerebral
intraconal intracranial intraductal intradural intrahepatic intraluminal intramedullary intramural intramuscular
intraocular intraosseous intraparenchymal intraperitoneal intrapulmonary intrarenal intrasellar intrathoracic
intrauterine intravenous intraventricular intussusception ipsilateral ischaemia ischaemic ischemia ischemic ischial
ischiorectal ischium isodense isoechoic isointense isthmus
jejunal jejunum jugular juxtacortical juxtaglomerular
keratosis kyphosis kyphotic kyphoscoliosis
labral labrum labyrinth labyrinthine lacrimal lacunar lacunae lacune lacunes lambdoid lamina laminae laminectomy laryngeal
larynx lentiform leptomeningeal leptomeninges lesion lesions leukomalacia leukoencephalopathy ligamentous ligamentum
linea lingula lingular lipoma lipomas lipomatous liposarcoma listhesis lithiasis lobar lobe lobes lobulated lobulation
lordosis lordotic lumbar lumbosacral lumen luminal lunate lymphadenitis lymphadenopathy lymphangitis lymphatic lymphoma
lymphomas lymphomatous lymphoid lytic
macroadenoma macrocalcification macrocalcifications malacia malalignment malignancy malignant malleolar malleoli
malleolus malrotation mammary mammogram mammography mandible mandibular manubrium margins marrow masseter mastoid
mastoiditis mastoids maxilla maxillary meatal meatus medial mediastinal mediastinitis mediastinum medulla medullary
medulloblastoma megacolon meningeal meninges meningioma meningiomas meningitis meniscal menisci meniscus mesenchymal
mesenteric mesentery mesothelioma metacarpal metacarpals metacarpophalangeal metaphyseal metaphysis metastases metastasis
metastatic metatarsal metatarsals metatarsophalangeal microadenoma microcalcification microcalcifications microvascular
midbrain midline mitral moiety morphology mucocele mucoid mucosa mucosal multicystic multifocal multilobulated
multinodular multiloculated multiseptated mural myelitis myelogram myelomalacia myeloma myelopathy myocardial myocardium
myoma myomas myometrial myometrium myositis
nasopharyngeal nasopharynx navicular necrosis necrotic neoplasm neoplasms neoplastic nephrectomy nephritis nephrocalcinosis
nephrogram nephrolithiasis nephropathy neural neuritis neuroforaminal neuroma neuropathic nidus nodal nodular nodularity
nodule nodules noncalcified nonenhancing nonobstructive nucleus
obliquity obstructive obturator occipital occiput oedema oedematous oesophageal oesophagitis oesophagus olecranon
olfactory oligaemia oligaemic omental omentum oncocytoma opacification opacified opacities opacity ophthalmic optic
orbit orbital orbits orchitis oropharyngeal oropharynx osseous ossicles ossicular ossification ossified osteitis
osteoarthritic osteoarthritis osteoblastic osteochondral osteochondroma osteochondritis osteolytic osteoma osteomyelitis
osteonecrosis osteopenia osteopenic osteophyte osteophytes osteophytic osteoporosis osteoporotic osteosarcoma ostium
ovarian ovaries ovary
pachymeningeal paediatric palatine pancreas pancreatic pancreaticoduodenal pancreatitis papilla papillary paraaortic
paracolic paraesophageal parafalcine paraganglioma paramedian parametrial parametrium paranasal parapelvic
parapharyngeal pararenal paraseptal paraspinal paratracheal paravertebral parenchyma parenchymal parietal parotid pars
patella patellae patellar patellofemoral pectineus pectoralis pedicle pedicles pedunculated pelvicalyceal pelvicaliceal
pelviureteric pelvis penumbra perianal periaortic periappendiceal periarticular peribronchial pericardial pericarditis
pericardium pericholecystic pericolic periductal perifissural perihepatic perihilar perilesional perilunate perimedullary
perinephric perineal perineum periosteal periosteum peripancreatic peripheral periportal perirenal perisplenic
peristalsis peristaltic peritoneal peritoneum peritonitis peritonsillar periventricular peroneal peroneus petrous
phalangeal phalanges phalanx pharyngeal pharynx phleboliths phlegmon phrenic pia pineal piriform pisiform pituitary placenta
placental plantar pleura pleural pleuritic plexus pneumatised pneumatized pneumatosis pneumobilia pneumonia pneumonitis
pneumoperitoneum pneumothorax polyp polypoid polyps pons pontine popliteal portal portocaval portosystemic posterolateral
posteromedial postcontrast postoperative prepatellar presacral prevascular prevertebral prostate prostatic prostatomegaly
proximal psoas pterygoid pterygopalatine pubic pubis pulmonary pulvinar putamen pyelonephritis pyelogram pyloric pylorus
pyonephrosis pyosalpinx
quadrate quadriceps
radial radiolucent radiopaque radiocarpal radioulnar radius ramus rectosigmoid rectum rectus renal reticular
reticulonodular retroareolar retrobulbar retrocaval retrocrural retroperitoneal retroperitoneum retropharyngeal
retrosternal retroverted retroversion rhabdomyolysis rotator rugae
sacral sacralisation sacralization sacroiliac sacroiliitis sacrum sagittal salpingitis saphenous sarcoidosis sarcoma
scaphoid scapula scapular schwannoma sciatic sclerosis sclerotic scoliosis scoliotic scrotal scrotum sellar semicircular
seminal semimembranosus semitendinosus septa septal septate septated septations septum serosal serous sesamoid
sialadenitis sigmoid sinonasal sinus sinuses sinusitis spermatic sphenoid sphenoidal sphincter spicules spiculated
splenic splenomegaly splenule splenules spondylitis spondyloarthropathy spondylolisthesis spondylolysis spondylosis
spondylotic stenosed stenoses stenosis stenotic sternal sternoclavicular sternocleidomastoid sternum striae striatum
subacromial subarachnoid subcapsular subcarinal subchondral subclavian subcortical subcutaneous subdeltoid subdiaphragmatic
subdural subependymal subfalcine subglottic subhepatic subluxation submandibular submental submucosal suboccipital
subphrenic subpleural subsegmental subscapularis subserosal subtalar subtrochanteric suburethral sulcal sulci sulcus
superolateral superomedial supraclavicular supracondylar supraglottic suprahyoid suprapatellar suprarenal suprasellar
supraspinatus supratentorial supraumbilical symphysis syndesmophytes syndesmosis synovial synovitis synovium syrinx
syringomyelia systolic
talar talus tarsal tarsometatarsal tegmen tegmentum temporal temporomandibular tendinitis tendinopathy tendinosis
tendinous tendon tendons tenosynovitis tentorial tentorium teratoma testes testicular testis thalamic thalami thalamus
thecal thoracic thoracolumbar thrombi thrombosed thrombosis thrombotic thrombus thymic thymoma thymus thyroid thyroiditis
tibia tibial tibialis tibiofemoral tibiofibular tonsil tonsillar tonsils tortuosity tortuous trabecular trabeculae
trachea tracheal tracheobronchial tracheostomy transcalvarial transverse trapezium trapezius trapezoid tricuspid trigeminal
trigone triquetral triquetrum trochanter trochanteric trochlea trochlear tubal turbinate turbinates
ulna ulnar umbilical umbilicus uncinate uncovertebral unilocular unremarkable ureter ureteral ureteric ureterocele
ureteropelvic ureterovesical ureters urethra urethral urinary urinoma urothelial uterine uterus uvula
vaginal vallecula valleculae valvular varices varicocele varicose vasa vascular vascularity vasculature vasculitis vasogenic
vena venae venous ventral ventricle ventricles ventricular ventriculomegaly vermis vertebra vertebrae vertebral vesical
vesicle vesicles vesicoureteric vesicoureteral vestibular vestibule vestibulocochlear villous visceral viscus vitreous
volvulus vomer
xiphisternum xiphoid
zygoma zygomatic

acoustic aliasing angled annotated artefact artefacts artifact artifacts axial bolus centimetre centimetres collimation
contrast coronal craniocaudal debris decubitus diffusion doppler echogenic enhancement fluoroscopy hounsfield
hyperintense hypointense isoechoic localiser localizer milliamp millimetre millimetres monophasic multiplanar
multiphasic noncontrast nonenhanced oblique orthogonal parasagittal perfusion phasic plain pulsatility radiograph
radiographs radiographic radiologically radiologist radiologists reformat reformats reformation reformations reformatted
resistive sagittal sonographic sonographically sonography spectral tomogram tomography transabdominal transducer
transrectal transvaginal triphasic tomosynthesis ultrasonography ultrasonographic venogram venography

aditus amygdala amygdalae angio ani anorectal antero antra aortopulmonary atrio basilic bifida brainstem buccal buccinator
bullosa calvaria calvarial calvarium capitellum carpo cauda cava caliber calibre celiac cerebello choana choanae
cochleariformis color colored conal coracoid cranio cribrosa defecography defaecography dentations digitorum dorsalis
dorsolumbar dyssynergic edema edematous epicondyles epiglottic epitympanic equina ethmoidalis eustachian extensor
extracranial facio falciform favor femora fibro flavum flexor fornix fronto geniculare genioglossus gingivobuccal
hallucis hemimandible hemo hemodynamically haemodynamically hemitongue hippocampi histopathologic homologue hyoglossus
incudal incudomalleal incudostapedial incus infective inferomedially infra infundibulum intercarpal intergluteal
interscalar intersphincteric intra intrarectally ischioanal junctional labyrinthitis levator levocardia longus
lunotriquetral mainstem malleus malrotated mamillary mammillary maneuver manoeuvre masticator maxillo medio medullaris
meningomyelocele metacarpo modiolus mortis myelination mylohyoid naso neurovascular nondependent nondilated ossificans
oro otitis otomastoiditis otosclerosis palatoglossal palatoglossus palatopharyngeal para parasplenic patello pedis peri
periprostatic peritoneocele petrosal phalangeal pilonidal pleuro pneumatisation pneumatization pneumo ponticulus postero
posteroinferiorly pre preseptal processus profunda protympanum protympanus pseudomeningocele pubococcygeal puborectalis
pyriform radicle radicles radicular radiodense radiohumeral raphe rectocele retro retromolar rami sacro scapholunate
scutum segmental semicanal semilunaris sella sinodural situs solitus spheno spina spinous stapes styloglossus styloid
subaortic subarcuate subarticular subclinical subglottis subiculum sublentiform submucosa sulcation superoinferior
supra supraglottis sylvian teres temporo thyroarytenoid tibio tracheo tubarius ulceroproliferative ulnaris uropathy
urogram uveoscleral vertebrals vertebro vesico visualised visualized volar
osteomeatal ostiomeatal ventriculo callosum corpus Guyon's Prussak's parasellar suboptimal acromio cath undisplaced nondisplaced
iohexol iodixanol iopamidol iopromide iomeprol gadobutrol gadoterate gadoteridol gadoxetate metoprolol

anteriorly posteriorly superiorly inferiorly medially laterally proximally distally caudally cranially circumferentially
diffusely focally heterogeneous heterogeneously ill irregularly mildly minimally moderately smoothly subtly
unremarkably bilaterally unilaterally centrally peripherally segmentally contiguously
`;

/** Every extra word, once each. */
export const MEDICAL_WORDS: string[] = [...new Set(WORDS.split(/\s+/).filter(Boolean))];
