'use client'

import React from 'react'
import { BOARD_BASE_MATERIALS } from '../constants/boq-builder-constants'

export function BoardDatalists() {
  return (
    <>
      {/* ── Item ID List ── */}
      <datalist id="item-id-list">
        <option value="BRD-001" />
        <option value="BRD-002" />
        <option value="BRD-003" />
        <option value="BRD-004" />
        <option value="BRD-005" />
        <option value="BRD-006 (Ext)" />
        <option value="BRD-007 (Ext)" />
        <option value="BRD-008 (Ext)" />
        <option value="LVR-001" />
        <option value="LVR-002" />
        <option value="LVR-003" />
        <option value="TRM-001" />
        <option value="EDG-001" />
        <option value="EDG-002 (Ext)" />
        <option value="SCR-075" />
        <option value="SCR-125" />
        <option value="SCR-150" />
        <option value="SCR-200" />
        <option value="SCR-250" />
        <option value="NAL-200" />
        <option value="NAL-125" />
        <option value="NAL-050" />
        <option value="PIN-001" />
        <option value="PIN-002 (Ext)" />
        <option value="ADH-001" />
        <option value="ADH-002" />
        <option value="ADH-003" />
        <option value="ADH-004" />
        <option value="ADH-005 (Ext)" />
      </datalist>

      {/* ── Core Boards Datalists ── */}
      <datalist id="core-thickness-list">
        <option value="6mm" />
        <option value="9mm" />
        <option value="12mm" />
        <option value="15mm" />
        <option value="18mm" />
        <option value="25mm" />
      </datalist>

      <datalist id="base-material-list">
        {BOARD_BASE_MATERIALS.map((mat) => (
          <option key={mat} value={mat} />
        ))}
      </datalist>

      <datalist id="laminate-surface-list">
        <option value="Beladoa Laminate" />
        <option value="Airolam Laminate" />
        <option value="None (Raw)" />
        <option value="Acrylic Finish" />
        <option value="Veneer" />
        <option value="PVC Sheet" />
        <option value="HPL" />
      </datalist>

      <datalist id="surface-code-list">
        <option value="2003 SMT (Super Matt)" />
        <option value="903 SMR (Suede Matt Finished)" />
        <option value="Raw Uncoated" />
        <option value="Heavy Structural" />
        <option value="Water Resistant" />
        <option value="HG Pure White" />
      </datalist>

      <datalist id="sheet-size-list">
        <option value="8' x 4'" />
        <option value="8' x 3'" />
        <option value="9' x 4'" />
        <option value="10' x 4'" />
      </datalist>

      <datalist id="functional-usage-list">
        <option value="Shutter / Exterior Cabinet" />
        <option value="Inner Box / Shelving" />
        <option value="Heavy Load Frame / Base" />
        <option value="Backing Panel / Partition" />
        <option value="Drawer Bottom / Backing" />
        <option value="Countertop Sub-base" />
        <option value="Sink Under-cabinet" />
        <option value="Modern Kitchen Fronts" />
        <option value="Feature Wall Accent" />
      </datalist>

      {/* ── Decorative Panels, Louvers & Edge Profiles Datalists ── */}
      <datalist id="profile-type-list">
        <option value="Fluted Panel" />
        <option value="T-Profile Bit" />
        <option value="Tape Trim" />
        <option value="L-Angle Profile" />
        <option value="Corner Trim" />
        <option value="U-Channel" />
        <option value="Groove Inlay" />
      </datalist>

      <datalist id="louver-material-list">
        <option value="Charcoal / WPC" />
        <option value="Aluminum / Brass" />
        <option value="PVC Plastic" />
        <option value="MDF Core" />
        <option value="Solid Wood" />
        <option value="Acrylic" />
      </datalist>

      <datalist id="accent-finish-list">
        <option value="Rose Gold Accent" />
        <option value="Rose Gold Line" />
        <option value="Metallic Rose Gold" />
        <option value="Solid White / Grey" />
        <option value="Matte Black" />
        <option value="Gold Anodized" />
        <option value="Silver Brushed" />
      </datalist>

      <datalist id="code-variant-list">
        <option value="Advance 14081" />
        <option value="Line Type A" />
        <option value="Line Type B" />
        <option value="T-Bit 10mm" />
        <option value="3mm Thickness" />
        <option value="1mm Thickness" />
      </datalist>

      <datalist id="primary-usage-list">
        <option value="Feature Wall Accent" />
        <option value="Framing Accent" />
        <option value="Secondary Wall Panel" />
        <option value="Groove Accent Inlay" />
        <option value="Board Edge Sealing" />
        <option value="Internal Shelving Edges" />
      </datalist>

      {/* ── Screws & Structural Fasteners Datalists ── */}
      <datalist id="fastener-type-list">
        <option value="Screw" />
        <option value="Wood Screw" />
        <option value="Drywall Screw" />
        <option value="Self Tapping Screw" />
        <option value="Concrete Anchor" />
        <option value="Machine Bolt" />
      </datalist>

      <datalist id="fastener-length-list">
        <option value='0.75" (3/4")' />
        <option value='1.25"' />
        <option value='1.50"' />
        <option value='2.00"' />
        <option value='2.50"' />
        <option value='3.00"' />
      </datalist>

      <datalist id="gauge-size-list">
        <option value="#6 Countered" />
        <option value="#7 Countered" />
        <option value="#8 Heavy" />
        <option value="#8 Wall Plug" />
        <option value="#10 Heavy Duty" />
      </datalist>

      <datalist id="fastener-finish-list">
        <option value="Zinc Coated" />
        <option value="Black Phosphate" />
        <option value="Steel" />
        <option value="Hardened Steel" />
        <option value="Brass Plated" />
        <option value="Stainless Steel" />
      </datalist>

      <datalist id="usage-purpose-list">
        <option value="Hinges & Drawer Runners" />
        <option value="Carcass Box Assembly" />
        <option value="Wall Cabinet Mounting" />
        <option value="Frame Anchor / Wall" />
        <option value="Heavy Wall Cleat / Base" />
      </datalist>

      {/* ── Nails, Pins & Anchors Datalists ── */}
      <datalist id="nail-type-list">
        <option value="Wire Nail" />
        <option value="Loose Nail" />
        <option value="Hardened Steel" />
        <option value="Double Head Pin" />
        <option value="Pneumatic Pin" />
      </datalist>

      {/* ── Adhesives & Chemical Solvents Datalists ── */}
      <datalist id="chemical-class-list">
        <option value="PVA Wood Adhesive" />
        <option value="Cyanoacrylate" />
        <option value="Contact Adhesive (Neoprene)" />
        <option value="Binding / Double Tape" />
        <option value="Neutral Cure Silicone" />
        <option value="PU Foam Sealant" />
      </datalist>

      <datalist id="application-method-list">
        <option value="Cold Press Wood Joinery" />
        <option value="Instant Edge & Trim Bond" />
        <option value="Manual Laminate Pressing" />
        <option value="Edge Fixing / Hold" />
        <option value="Sink / Marble Joint Sealing" />
      </datalist>

      {/* ── Closet / Cabinet Datalists ── */}
      <datalist id="cabinet-usage-list">
        <option value="Shutter" />
        <option value="Body" />
        <option value="Back Ply" />
        <option value="Top Cabinet" />
        <option value="Bottom Cabinet" />
        <option value="Carcass / Internal" />
        <option value="Shelves" />
        <option value="Backing" />
        <option value="Drawer Box" />
      </datalist>

      <datalist id="cabinet-base-material-list">
        <option value="MR MDF (Moisture-Resistant Medium-Density Fiberboard)" />
        <option value="MR Board" />
        <option value="Elegant Board" />
        <option value="White Board" />
        <option value="Starlight Board" />
        <option value="Marine Plywood" />
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
        <option value="MDF Core" />
        <option value="HDF Core" />
        <option value="Particle Board" />
        <option value="WPC (Wood Plastic)" />
      </datalist>

      <datalist id="cabinet-thickness-list">
        <option value="18mm" />
        <option value="16mm" />
        <option value="9mm" />
        <option value="6mm" />
      </datalist>

      <datalist id="cabinet-shutter-body-thickness-list">
        <option value="16mm" />
        <option value="18mm" />
      </datalist>

      <datalist id="cabinet-back-ply-thickness-list">
        <option value="6mm" />
        <option value="9mm" />
      </datalist>

      <datalist id="cabinet-laminate-finish-list">
        <option value="Champagne Gold" />
        <option value="Code: A-7123" />
        <option value="Code: A-7112" />
        <option value="Duco Paint Finish" />
        <option value="White Matt Finish" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Super 101" />
        <option value="Super 111" />
      </datalist>

      <datalist id="cabinet-side-spec-list">
        <option value="Both Side" />
        <option value="Standard" />
        <option value="Single Side" />
        <option value="Single Side Liner" />
      </datalist>

      <datalist id="cabinet-edging-tape-list">
        <option value="—" />
        <option value="1 Roll (Edging)" />
        <option value="2 Roll (Edging)" />
        <option value="3 Roll (Edging)" />
        <option value="4 Roll (Edging)" />
        <option value="5 Roll (Edging)" />
        <option value="1 Roll" />
        <option value="2 Roll" />
        <option value="4 Roll" />
      </datalist>

      <datalist id="cabinet-core-substrate-list">
        <option value="MR MDF (Moisture-Resistant Medium-Density Fiberboard)" />
        <option value="MR Board" />
        <option value="Marine Plywood" />
        <option value="Garjon Plywood" />
        <option value="Commercial Ply" />
        <option value="MDF Core" />
      </datalist>

      <datalist id="cabinet-front-laminate-list">
        <option value="MR Champagne Gold" />
        <option value="Champagne Gold" />
        <option value="Super 101" />
        <option value="Super 111" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Code: A-7123" />
        <option value="Code: A-7112" />
        <option value="Duco Paint Finish" />
        <option value="White Matt Finish" />
      </datalist>

      <datalist id="cabinet-back-laminate-list">
        <option value="Same as Front (Both Side)" />
        <option value="Single Side Liner" />
        <option value="White Liner" />
        <option value="Luxury 8193" />
        <option value="Aromex 9904" />
        <option value="Super 101 (Both Side)" />
        <option value="Super 111 (Both Side)" />
        <option value="MR Champagne Gold" />
        <option value="Champagne Gold" />
      </datalist>

      {/* ── Accessories & Hardware Datalists ── */}
      <datalist id="accessory-category-list">
        <option value="Kitchen" />
        <option value="Closet" />
        <option value="Cabinet" />
        <option value="Hardware" />
      </datalist>

      <datalist id="accessory-service-category-list">
        <option value="Fitting & Hardware" />
        <option value="Installation Labor" />
        <option value="Transport & Handling" />
        <option value="Cleaning & Alignment" />
      </datalist>
    </>
  )
}
