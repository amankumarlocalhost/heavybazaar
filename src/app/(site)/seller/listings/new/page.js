'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getCurrentPosition } from '@/lib/geolocation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import Radio from '@/components/ui/Radio';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import PageHeader from '@/components/ui/PageHeader';
import { MapPinIcon } from '@/components/ui/Icons';

const CURRENT_YEAR = new Date().getFullYear();

export default function PostEquipmentPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    condition: 'good',
    state: '',
    district: '',
    city: '',
    area: '',
    pincode: '',
    fullAddress: '',
    listingType: 'fixed_price',
    fixedPrice: '',
    quantity: '1',
    startingBid: '',
    minBidIncrement: '',
    reservePrice: '',
    startTime: '',
    endTime: '',
  });

  // GPS se mila hai to yahan {lat,lng} — backend isi se reverse-geocode
  // karta hai aur baad me nearby-search ke liye use karta hai. Seller ke
  // manual edits is `geo` ko invalidate nahi karte — sirf text fields change hoti hain.
  const [geo, setGeo] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationSource, setLocationSource] = useState('manual'); // 'gps' | 'manual'
  const [locateError, setLocateError] = useState('');
  // Seller ne haath se jo location fields edit ki hain — agar "Use my
  // current location" DOBARA click ho (ya pehle click ke baad kuch edit
  // ho chuka ho), un fields ko re-detect overwrite NAHI karega.
  const [touchedLocationFields, setTouchedLocationFields] = useState(() => new Set());

  const [specs, setSpecs] = useState({
    general: { brand: '', type: '', productionYear: '', hoursOnMeter: '', totalWeightKg: '' },
    engine: { brand: '', type: '', cylinderCount: '' },
    hydraulic: { systemType: '', quickCouplerBrand: '', quickCouplerType: '' },
    cabin: { hasAirSuspensionSeat: false, hasAirConditioning: false },
    undercarriage: { shoesWidthMm: '', tracksWidthMm: '' },
  });

  useEffect(() => {
    api
      .get('/categories')
      .then((data) => {
        // Flat list banao — top-level + unke children, dono dikhane ke liye
        const flat = [];
        data.forEach((cat) => {
          flat.push(cat);
          (cat.children || []).forEach((child) => flat.push(child));
        });
        setCategories(flat);
      })
      .catch(() => {});
  }, []);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * "Use my current location" — browser GPS -> backend reverse-geocode ->
   * form fields prefill. Seller apne aap se hamesha edit kar sakta hai —
   * ye sirf ek starting point hai, final save nahi.
   */
  async function handleDetectLocation() {
    setLocateError('');
    setLocating(true);
    try {
      const position = await getCurrentPosition();
      setGeo(position);
      setLocationSource('gps');

      const detected = await api.get(`/listings/geo/reverse?lat=${position.lat}&lng=${position.lng}`);
      setForm((prev) => ({
        ...prev,
        state: touchedLocationFields.has('state') ? prev.state : detected.state || prev.state,
        city: touchedLocationFields.has('city') ? prev.city : detected.city || prev.city,
        district: touchedLocationFields.has('district') ? prev.district : detected.district || prev.district,
        area: touchedLocationFields.has('area') ? prev.area : detected.area || prev.area,
        pincode: touchedLocationFields.has('pincode') ? prev.pincode : detected.pincode || prev.pincode,
      }));
    } catch (err) {
      if (err.code === 1) {
        setLocateError('Location permission denied. Please enter your location manually below.');
      } else {
        setLocateError('Could not detect your location. Please enter it manually below.');
      }
    } finally {
      setLocating(false);
    }
  }

  // Seller ne koi bhi location field haath se badli to ab wo "manual" hai —
  // GPS point (agar tha) DB me address-hint ke liye reh jaata hai, par
  // display/label ab manual maana jaayega.
  function updateLocationField(field, value) {
    setLocationSource('manual');
    setTouchedLocationFields((prev) => new Set(prev).add(field));
    updateForm(field, value);
  }

  function updateSpec(group, field, value) {
    setSpecs((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  }

  function buildSpecsPayload() {
    // Khaali fields hataao aur numbers ko convert karo — backend ko sirf
    // wahi bhejo jo user ne actually bhara ho
    const payload = {};
    for (const [group, fields] of Object.entries(specs)) {
      const cleaned = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === '' || value === undefined) continue;
        if (typeof value === 'boolean') {
          cleaned[key] = value;
        } else if (!isNaN(value)) {
          cleaned[key] = Number(value);
        } else {
          cleaned[key] = value;
        }
      }
      if (Object.keys(cleaned).length > 0) payload[group] = cleaned;
    }
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const body = {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        condition: form.condition,
        location: {
          state: form.state || undefined,
          city: form.city || undefined,
          district: form.district || undefined,
          area: form.area || undefined,
          pincode: form.pincode || undefined,
          fullAddress: form.fullAddress || undefined,
          ...(geo ? { geo } : {}),
        },
        listingType: form.listingType,
        specifications: buildSpecsPayload(),
      };

      if (form.listingType === 'fixed_price') {
        body.fixedPrice = Number(form.fixedPrice);
        body.quantity = Number(form.quantity) || 1;
      } else {
        body.auctionConfig = {
          startingBid: Number(form.startingBid),
          minBidIncrement: Number(form.minBidIncrement),
          ...(form.reservePrice ? { reservePrice: Number(form.reservePrice) } : {}),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        };
      }

      const listing = await api.post('/listings', body, 'user');
      router.push(`/seller/listings/${listing._id}`);
    } catch (err) {
      setError(err.message || 'Error creating listing');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Post Equipment" description="List your equipment for sale or start a live auction." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Basic Details</h2>
          <div className="space-y-4">
            <Input
              label="Equipment Name"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="e.g. Hitachi ZX19-6 CR"
              required
            />

            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              rows={3}
            />

            <Select
              label="Category"
              value={form.categoryId}
              onChange={(e) => updateForm('categoryId', e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name?.en}
                </option>
              ))}
            </Select>

            <Select
              label="Condition"
              value={form.condition}
              onChange={(e) => updateForm('condition', e.target.value)}
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </Select>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Location</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={locating}
              onClick={handleDetectLocation}
            >
              <MapPinIcon className="h-4 w-4" />
              Use my current location
            </Button>
          </div>

          {locateError && (
            <p className="mb-3 text-xs text-amber-600">{locateError}</p>
          )}
          {locationSource === 'gps' && !locateError && (
            <p className="mb-3 text-xs text-emerald-600">
              Detected from your device — review and edit if anything looks wrong.
            </p>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="State"
                value={form.state}
                onChange={(e) => updateLocationField('state', e.target.value)}
                placeholder="e.g. Haryana"
                required
              />
              <Input
                label="District"
                value={form.district}
                onChange={(e) => updateLocationField('district', e.target.value)}
                placeholder="e.g. Jind"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => updateLocationField('city', e.target.value)}
                placeholder="e.g. Jind"
              />
              <Input
                label="Area / Locality"
                value={form.area}
                onChange={(e) => updateLocationField('area', e.target.value)}
                placeholder="e.g. Railway Colony"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(e) => updateLocationField('pincode', e.target.value)}
                placeholder="e.g. 126102"
              />
            </div>
            <Textarea
              label="Full Address"
              value={form.fullAddress}
              onChange={(e) => updateLocationField('fullAddress', e.target.value)}
              rows={2}
              placeholder="Full address where the machine is located"
            />
            <p className="text-xs text-slate-500">
              Your exact address is only used to calculate distance for nearby buyers — it is
              never shown publicly. Buyers only see your city/area/state.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Pricing</h2>

          <div className="mb-4 flex gap-6">
            <Radio
              name="listingType"
              label="Fixed Price"
              checked={form.listingType === 'fixed_price'}
              onChange={() => updateForm('listingType', 'fixed_price')}
            />
            <Radio
              name="listingType"
              label="Auction"
              checked={form.listingType === 'auction'}
              onChange={() => updateForm('listingType', 'auction')}
            />
          </div>

          {form.listingType === 'fixed_price' ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price (₹)"
                type="number"
                value={form.fixedPrice}
                onChange={(e) => updateForm('fixedPrice', e.target.value)}
                required
              />
              <Input
                label="Units Available"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => updateForm('quantity', e.target.value)}
                hint="How many of this item do you have to sell?"
                required
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Starting Bid (₹)"
                  type="number"
                  value={form.startingBid}
                  onChange={(e) => updateForm('startingBid', e.target.value)}
                  required
                />
                <Input
                  label="Minimum Bid Increment (₹)"
                  type="number"
                  value={form.minBidIncrement}
                  onChange={(e) => updateForm('minBidIncrement', e.target.value)}
                  required
                />
              </div>
              <Input
                label="Reserve Price (₹) — optional"
                type="number"
                value={form.reservePrice}
                onChange={(e) => updateForm('reservePrice', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Auction Start"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => updateForm('startTime', e.target.value)}
                  required
                />
                <Input
                  label="Auction End"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => updateForm('endTime', e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-slate-500">
                You&apos;ll need to pay the EMD before the auction is published — this happens in the next step after creating the draft.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Specifications (optional)</h2>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">General</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Brand"
                  value={specs.general.brand}
                  onChange={(e) => updateSpec('general', 'brand', e.target.value)}
                />
                <Input
                  placeholder="Type"
                  value={specs.general.type}
                  onChange={(e) => updateSpec('general', 'type', e.target.value)}
                />
                <Input
                  placeholder={`Production Year (max ${CURRENT_YEAR})`}
                  type="number"
                  value={specs.general.productionYear}
                  onChange={(e) => updateSpec('general', 'productionYear', e.target.value)}
                />
                <Input
                  placeholder="Hours on Meter"
                  type="number"
                  value={specs.general.hoursOnMeter}
                  onChange={(e) => updateSpec('general', 'hoursOnMeter', e.target.value)}
                />
                <Input
                  placeholder="Total Weight (kg)"
                  type="number"
                  value={specs.general.totalWeightKg}
                  onChange={(e) => updateSpec('general', 'totalWeightKg', e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Engine</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Engine Brand"
                  value={specs.engine.brand}
                  onChange={(e) => updateSpec('engine', 'brand', e.target.value)}
                />
                <Input
                  placeholder="Engine Type"
                  value={specs.engine.type}
                  onChange={(e) => updateSpec('engine', 'type', e.target.value)}
                />
                <Input
                  placeholder="Cylinder Count"
                  type="number"
                  value={specs.engine.cylinderCount}
                  onChange={(e) => updateSpec('engine', 'cylinderCount', e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Hydraulic</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="System Type"
                  value={specs.hydraulic.systemType}
                  onChange={(e) => updateSpec('hydraulic', 'systemType', e.target.value)}
                />
                <Input
                  placeholder="Quick Coupler Brand"
                  value={specs.hydraulic.quickCouplerBrand}
                  onChange={(e) => updateSpec('hydraulic', 'quickCouplerBrand', e.target.value)}
                />
                <Input
                  placeholder="Quick Coupler Type"
                  value={specs.hydraulic.quickCouplerType}
                  onChange={(e) => updateSpec('hydraulic', 'quickCouplerType', e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Cabin</p>
              <div className="flex gap-6">
                <Checkbox
                  label="Air Suspension Seat"
                  checked={specs.cabin.hasAirSuspensionSeat}
                  onChange={(e) => updateSpec('cabin', 'hasAirSuspensionSeat', e.target.checked)}
                />
                <Checkbox
                  label="Air Conditioning"
                  checked={specs.cabin.hasAirConditioning}
                  onChange={(e) => updateSpec('cabin', 'hasAirConditioning', e.target.checked)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Undercarriage</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Shoes Width (mm)"
                  type="number"
                  value={specs.undercarriage.shoesWidthMm}
                  onChange={(e) => updateSpec('undercarriage', 'shoesWidthMm', e.target.value)}
                />
                <Input
                  placeholder="Tracks Width (mm)"
                  type="number"
                  value={specs.undercarriage.tracksWidthMm}
                  onChange={(e) => updateSpec('undercarriage', 'tracksWidthMm', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" loading={submitting}>
          Create Draft and Add Photos
        </Button>
      </form>
    </div>
  );
}
